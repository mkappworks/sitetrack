import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshToken } from './entities/refresh-token.entity';

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
    findOne: jest.fn(async (opts: { where: Partial<RefreshToken> }) =>
      rows.find((r) =>
        Object.entries(opts.where).every(
          ([k, v]) => (r as any)[k] === v,
        ),
      ) ?? null,
    ),
    update: jest.fn(async (where: any, patch: Partial<RefreshToken>) => {
      let count = 0;
      for (const row of rows) {
        const matches = Object.entries(where).every(([k, v]) => {
          // typeorm IsNull() returns a FindOperator instance. The service
          // only ever uses `IsNull()` (for revokedAt: IsNull()); detect any
          // FindOperator-shaped value and treat it as "column is null".
          if (
            v &&
            typeof v === 'object' &&
            (v as any).constructor?.name === 'FindOperator'
          ) {
            return (row as any)[k] === null;
          }
          return (row as any)[k] === v;
        });
        if (matches) {
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
      await service.issueForLogin('user-1');
      expect(repo.rows[0].familyId).toBe(repo.rows[0].id);
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
});
