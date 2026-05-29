import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { AuditLogEntry, AuditAction } from './entities/audit-log.entity';
import { AuditLogPage } from './dto/audit-log-page.type';
import { PaginationArgs } from '../common/pagination/paginated.type';

export interface AuditActor {
  id: string;
  email?: string | null;
}

export interface RecordAuditInput {
  action: AuditAction;
  actor?: AuditActor | null;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntry)
    private readonly repo: Repository<AuditLogEntry>,
  ) {}

  private toEntity(input: RecordAuditInput): Partial<AuditLogEntry> {
    return {
      action: input.action,
      actorId: input.actor?.id ?? null,
      actorEmail: input.actor?.email ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      targetLabel: input.targetLabel ?? null,
      ipAddress: input.ipAddress ?? null,
    };
  }

  // Best-effort persist for events where availability beats completeness
  // (auth events: a failed audit insert must NOT block a login). Swallows +
  // logs instead of rethrowing.
  async record(input: RecordAuditInput): Promise<void> {
    try {
      await this.repo.save(this.repo.create(this.toEntity(input)));
    } catch (err) {
      this.logger.error(
        `Failed to write audit entry ${input.action}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // Transactional persist for destructive data ops: the audit row commits
  // atomically with the data change. Does NOT swallow — a failure here rolls
  // back the whole transaction (no orphaned delete without its audit trail).
  // Caller must pass the transaction's EntityManager.
  async recordTx(manager: EntityManager, input: RecordAuditInput): Promise<void> {
    await manager.save(AuditLogEntry, this.toEntity(input));
  }

  async findAll(pagination: PaginationArgs): Promise<AuditLogPage> {
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      take: pagination.limit,
      skip: pagination.offset,
    });
    return { items, total, limit: pagination.limit, offset: pagination.offset };
  }
}
