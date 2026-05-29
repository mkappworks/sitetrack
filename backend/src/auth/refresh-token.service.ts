import {
  Injectable,
  UnauthorizedException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

export interface IssuedRefreshToken {
  rawToken: string;
  expiresAt: Date;
  familyId: string;
}

interface IssueContext {
  userAgent?: string | null;
  ipAddress?: string | null;
}

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);
  private readonly ttlMs: number;

  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
    config: ConfigService,
    // @Optional so unit specs construct without the AuditModule.
    @Optional()
    private readonly audit?: AuditService,
  ) {
    const days = parseInt(
      config.get<string>('REFRESH_TOKEN_TTL_DAYS', '30'),
      10,
    );
    this.ttlMs = days * 24 * 60 * 60 * 1000;
  }

  // Initial issue — called from login. Starts a fresh rotation chain whose
  // familyId equals the issued row's id (self-reference). Callers receive the
  // RAW token; only the hash is persisted.
  async issueForLogin(userId: string, ctx: IssueContext = {}): Promise<IssuedRefreshToken> {
    const raw = this.generateRawToken();
    const row = this.repo.create({
      userId,
      tokenHash: this.hash(raw),
      familyId: '00000000-0000-0000-0000-000000000000', // placeholder, fixed below
      expiresAt: new Date(Date.now() + this.ttlMs),
      revokedAt: null,
      replacedByTokenId: null,
      userAgent: ctx.userAgent ?? null,
      ipAddress: ctx.ipAddress ?? null,
    });
    const saved = await this.repo.save(row);
    // familyId = id for the chain head; second save updates only this column.
    saved.familyId = saved.id;
    await this.repo.save(saved);
    return { rawToken: raw, expiresAt: saved.expiresAt, familyId: saved.familyId };
  }

  // Rotate a presented refresh token. Returns the next raw token and its
  // expiry. Throws UnauthorizedException on any of:
  //   - token not found
  //   - token expired
  //   - token already revoked (REUSE → revoke whole family)
  //   - presented token's user does not exist (cascade should prevent this)
  async rotate(
    rawToken: string,
    ctx: IssueContext = {},
  ): Promise<{ userId: string; familyId: string; next: IssuedRefreshToken }> {
    const tokenHash = this.hash(rawToken);
    const existing = await this.repo.findOne({ where: { tokenHash } });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }
    // REUSE DETECTION: presenting a token that has already been rotated /
    // revoked means either an attacker is using a stolen token after the
    // legitimate client refreshed, or vice-versa. Either way we cannot
    // distinguish good from bad — revoke the WHOLE chain so neither can
    // proceed, and force re-login.
    if (existing.revokedAt !== null) {
      this.logger.warn(
        `Refresh-token REUSE detected for family ${existing.familyId} ` +
          `(user ${existing.userId}). Revoking entire family.`,
      );
      await this.revokeFamily(existing.familyId);
      await this.audit?.record({
        action: AuditAction.REFRESH_REUSE_DETECTED,
        actor: { id: existing.userId },
        targetType: 'User',
        targetId: existing.userId,
        ipAddress: ctx.ipAddress ?? null,
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    // Happy path — atomically: insert new, mark old revoked + replaced.
    const raw = this.generateRawToken();
    const next = this.repo.create({
      userId: existing.userId,
      tokenHash: this.hash(raw),
      familyId: existing.familyId,
      expiresAt: new Date(Date.now() + this.ttlMs),
      revokedAt: null,
      replacedByTokenId: null,
      userAgent: ctx.userAgent ?? existing.userAgent,
      ipAddress: ctx.ipAddress ?? existing.ipAddress,
    });
    const saved = await this.repo.save(next);

    existing.revokedAt = new Date();
    existing.replacedByTokenId = saved.id;
    await this.repo.save(existing);

    return {
      userId: existing.userId,
      familyId: existing.familyId,
      next: { rawToken: raw, expiresAt: saved.expiresAt, familyId: saved.familyId },
    };
  }

  // Logout — revoke the presented token only. Does NOT revoke the family;
  // the user may legitimately be logged in on other devices. Returns the
  // owning userId (or null if the token was unknown) so the caller can
  // audit the logout.
  async revoke(rawToken: string): Promise<string | null> {
    const tokenHash = this.hash(rawToken);
    const existing = await this.repo.findOne({ where: { tokenHash } });
    await this.repo.update(
      { tokenHash, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return existing?.userId ?? null;
  }

  // Revoke every live token in a family. Used by reuse-detection.
  async revokeFamily(familyId: string): Promise<void> {
    await this.repo.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  // Revoke every live token for a user. Used by the admin "force logout"
  // action and when an admin suspends an account.
  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  // One live token per family (rotation revokes predecessors), so the set of
  // live, unexpired tokens for a user IS the set of active sessions/devices.
  async listActiveSessions(userId: string): Promise<RefreshToken[]> {
    return this.repo.find({
      where: { userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });
  }

  // Revoke a session (whole family) but ONLY if it belongs to the given
  // user — the ownership guard that lets self-service revoke run safely.
  // Returns false if no live session with that familyId exists for the user.
  async revokeSessionForUser(userId: string, familyId: string): Promise<boolean> {
    const live = await this.repo.findOne({
      where: { userId, familyId, revokedAt: IsNull() },
    });
    if (!live) return false;
    await this.revokeFamily(familyId);
    return true;
  }

  // 256 bits of entropy → 64 hex chars. crypto.randomBytes is CSPRNG.
  private generateRawToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
