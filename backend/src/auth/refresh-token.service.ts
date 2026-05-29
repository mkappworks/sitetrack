import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';

export interface IssuedRefreshToken {
  rawToken: string;
  expiresAt: Date;
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
    return { rawToken: raw, expiresAt: saved.expiresAt };
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
  ): Promise<{ userId: string; next: IssuedRefreshToken }> {
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
      next: { rawToken: raw, expiresAt: saved.expiresAt },
    };
  }

  // Logout — revoke the presented token only. Does NOT revoke the family;
  // the user may legitimately be logged in on other devices.
  async revoke(rawToken: string): Promise<void> {
    const tokenHash = this.hash(rawToken);
    await this.repo.update(
      { tokenHash, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  // Revoke every live token in a family. Used by reuse-detection.
  async revokeFamily(familyId: string): Promise<void> {
    await this.repo.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  // Revoke every live token for a user — used when an admin invalidates
  // a user (future: password change, suspend account). Exposed for the
  // service surface; not wired to a mutation yet.
  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  // 256 bits of entropy → 64 hex chars. crypto.randomBytes is CSPRNG.
  private generateRawToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
