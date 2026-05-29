import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshToken } from './entities/refresh-token.entity';

// Matches a row against a typeorm-style `where` clause. Understands the
// FindOperators the service actually uses: IsNull() and MoreThan(date).
function rowMatches(row: any, where: Record<string, any>): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v && typeof v === 'object' && (v as any).constructor?.name === 'FindOperator') {
      const op = v as any;
      // typeorm FindOperator exposes `_type` ('isNull' | 'moreThan' | ...)
      // and `_value`.
      if (op._type === 'isNull') return row[k] === null;
      if (op._type === 'moreThan') return row[k] > op._value;
      throw new Error(`fake repo: unsupported FindOperator ${op._type}`);
    }
    return row[k] === v;
  });
}

// In-memory fake repo. Mirrors only the shape the service uses.
function makeFakeRepo() {
  const rows: RefreshToken[] = [];
  let idCounter = 0;
  return {
    rows,
    create: jest.fn((partial: Partial<RefreshToken>) => ({
      ...partial,
      revokedAt: partial.revokedAt ?? null,
      replacedByTokenId: partial.replacedByTokenId ?? null,
    } as RefreshToken)),
    save: jest.fn(async (entity: RefreshToken) => {
      if (!entity.id) entity.id = `tok-${++idCounter}`;
      const existing = rows.findIndex((r) => r.id === entity.id);
      if (existing >= 0) rows[existing] = entity;
      else rows.push(entity);
      return entity;
    }),
    findOne: jest.fn(async (opts: { where: Record<string, any> }) =>
      rows.find((r) => rowMatches(r, opts.where)) ?? null,
    ),
    find: jest.fn(async (opts: { where: Record<string, any> }) =>
      rows.filter((r) => rowMatches(r, opts.where)),
    ),
    update: jest.fn(async (where: any, patch: Partial<RefreshToken>) => {
      let count = 0;
      for (const row of rows) {
        if (rowMatches(row, where)) {
          Object.assign(row, patch);
          count++;
        }
      }
      return { affected: count };
    }),
  };
}

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let repo: ReturnType<typeof makeFakeRepo>;

  beforeEach(async () => {
    repo = makeFakeRepo();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: getRepositoryToken(RefreshToken), useValue: repo },
        {
          provide: ConfigService,
          useValue: { get: (_k: string, d: string) => d },
        },
      ],
    }).compile();
    service = moduleRef.get(RefreshTokenService);
  });

  describe('issueForLogin', () => {
    it('persists a hashed token, never the raw token', async () => {
      const { rawToken } = await service.issueForLogin('user-1');
      expect(rawToken).toMatch(/^[0-9a-f]{64}$/);
      expect(repo.rows).toHaveLength(1);
      expect(repo.rows[0].tokenHash).not.toBe(rawToken);
      expect(repo.rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('starts a new family whose id is the token id', async () => {
      const issued = await service.issueForLogin('user-1');
      expect(repo.rows[0].familyId).toBe(repo.rows[0].id);
      expect(issued.familyId).toBe(repo.rows[0].id);
    });

    it('sets an expiry in the future', async () => {
      const { expiresAt } = await service.issueForLogin('user-1');
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('rotate', () => {
    it('issues a new token in the same family and marks the old one revoked', async () => {
      const issued = await service.issueForLogin('user-1');
      const familyBefore = repo.rows[0].familyId;

      const { userId, next } = await service.rotate(issued.rawToken);

      expect(userId).toBe('user-1');
      expect(repo.rows).toHaveLength(2);
      // Old row revoked + linked to successor
      expect(repo.rows[0].revokedAt).not.toBeNull();
      expect(repo.rows[0].replacedByTokenId).toBe(repo.rows[1].id);
      // New row alive, same family
      expect(repo.rows[1].revokedAt).toBeNull();
      expect(repo.rows[1].familyId).toBe(familyBefore);
      expect(next.rawToken).not.toBe(issued.rawToken);
    });

    it('rejects an unknown token', async () => {
      await expect(service.rotate('deadbeef')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an expired token', async () => {
      const issued = await service.issueForLogin('user-1');
      // Force the persisted row to be expired. Hash lookup still hits it,
      // but the expiry check rejects.
      repo.rows[0].expiresAt = new Date(Date.now() - 1000);
      await expect(service.rotate(issued.rawToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('detects reuse and revokes the entire family', async () => {
      const issued = await service.issueForLogin('user-1');
      // First rotation succeeds.
      await service.rotate(issued.rawToken);
      // Second presentation of the SAME token = reuse → family revoked.
      await expect(service.rotate(issued.rawToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      // BOTH rows in the family are now revoked.
      expect(repo.rows.every((r) => r.revokedAt !== null)).toBe(true);
    });

    it('rotation chain stays single-family across multiple rotations', async () => {
      const issued = await service.issueForLogin('user-1');
      const { next: r1 } = await service.rotate(issued.rawToken);
      const { next: r2 } = await service.rotate(r1.rawToken);
      await service.rotate(r2.rawToken);

      const families = new Set(repo.rows.map((r) => r.familyId));
      expect(families.size).toBe(1);
    });
  });

  describe('revoke', () => {
    it('marks the presented token revoked', async () => {
      const { rawToken } = await service.issueForLogin('user-1');
      await service.revoke(rawToken);
      expect(repo.rows[0].revokedAt).not.toBeNull();
    });

    it('is idempotent — revoking an already-revoked token does nothing', async () => {
      const { rawToken } = await service.issueForLogin('user-1');
      await service.revoke(rawToken);
      const firstRevokedAt = repo.rows[0].revokedAt;
      await service.revoke(rawToken);
      expect(repo.rows[0].revokedAt).toBe(firstRevokedAt);
    });
  });

  describe('revokeAllForUser', () => {
    it('revokes every live token for the user', async () => {
      await service.issueForLogin('user-1');
      await service.issueForLogin('user-1');
      await service.issueForLogin('user-2');
      await service.revokeAllForUser('user-1');

      const user1Rows = repo.rows.filter((r) => r.userId === 'user-1');
      const user2Rows = repo.rows.filter((r) => r.userId === 'user-2');
      expect(user1Rows.every((r) => r.revokedAt !== null)).toBe(true);
      expect(user2Rows.every((r) => r.revokedAt === null)).toBe(true);
    });
  });

  describe('listActiveSessions', () => {
    it('returns one live token per device and excludes revoked/expired', async () => {
      const a = await service.issueForLogin('user-1'); // device A
      await service.issueForLogin('user-1'); // device B
      // Rotate device A — predecessor revoked, successor live → still ONE
      // live token for that family.
      await service.rotate(a.rawToken);
      // A third device, then revoke it.
      const c = await service.issueForLogin('user-1');
      await service.revokeSessionForUser('user-1', c.familyId);

      const sessions = await service.listActiveSessions('user-1');
      // Device A (rotated, 1 live) + device B (1 live) = 2. Device C revoked.
      expect(sessions).toHaveLength(2);
      expect(sessions.every((s) => s.revokedAt === null)).toBe(true);
    });

    it('does not return another user\'s sessions', async () => {
      await service.issueForLogin('user-1');
      await service.issueForLogin('user-2');
      const sessions = await service.listActiveSessions('user-1');
      expect(sessions).toHaveLength(1);
      expect(sessions[0].userId).toBe('user-1');
    });
  });

  describe('revokeSessionForUser', () => {
    it('revokes the family when it belongs to the user', async () => {
      const s = await service.issueForLogin('user-1');
      const ok = await service.revokeSessionForUser('user-1', s.familyId);
      expect(ok).toBe(true);
      const live = await service.listActiveSessions('user-1');
      expect(live).toHaveLength(0);
    });

    it('refuses to revoke a session owned by a different user', async () => {
      const s = await service.issueForLogin('user-1');
      const ok = await service.revokeSessionForUser('user-2', s.familyId);
      expect(ok).toBe(false);
      // user-1's session is untouched.
      expect(repo.rows[0].revokedAt).toBeNull();
    });
  });
});
