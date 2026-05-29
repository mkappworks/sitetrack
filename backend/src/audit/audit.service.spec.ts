import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLogEntry, AuditAction } from './entities/audit-log.entity';

function makeFakeRepo() {
  const rows: AuditLogEntry[] = [];
  return {
    rows,
    create: jest.fn((p: Partial<AuditLogEntry>) => ({ ...p } as AuditLogEntry)),
    save: jest.fn(async (e: AuditLogEntry) => {
      rows.push(e);
      return e;
    }),
    findAndCount: jest.fn(async () => [rows, rows.length] as [AuditLogEntry[], number]),
  };
}

describe('AuditService', () => {
  let service: AuditService;
  let repo: ReturnType<typeof makeFakeRepo>;

  beforeEach(async () => {
    repo = makeFakeRepo();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLogEntry), useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(AuditService);
  });

  describe('record', () => {
    it('persists an entry with actor + target snapshot', async () => {
      await service.record({
        action: AuditAction.PROJECT_SOFT_DELETED,
        actor: { id: 'u1', email: 'a@b.c' },
        targetType: 'Project',
        targetId: 'p1',
        targetLabel: 'Tower A',
      });
      expect(repo.rows).toHaveLength(1);
      expect(repo.rows[0]).toMatchObject({
        action: AuditAction.PROJECT_SOFT_DELETED,
        actorId: 'u1',
        actorEmail: 'a@b.c',
        targetType: 'Project',
        targetId: 'p1',
        targetLabel: 'Tower A',
      });
    });

    it('defaults missing actor/target fields to null', async () => {
      await service.record({ action: AuditAction.USER_LOGIN });
      expect(repo.rows[0]).toMatchObject({
        actorId: null,
        actorEmail: null,
        targetType: null,
        targetId: null,
      });
    });

    it('NEVER throws when the write fails — audit must not break the audited op', async () => {
      repo.save.mockRejectedValueOnce(new Error('db down'));
      await expect(
        service.record({ action: AuditAction.PROJECT_PURGED }),
      ).resolves.toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('returns a paginated page shape', async () => {
      await service.record({ action: AuditAction.USER_LOGIN });
      const page = await service.findAll({ limit: 20, offset: 0 });
      expect(page).toMatchObject({ total: 1, limit: 20, offset: 0 });
      expect(page.items).toHaveLength(1);
    });
  });
});
