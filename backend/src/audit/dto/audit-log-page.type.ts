import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/pagination/paginated.type';
import { AuditLogEntry } from '../entities/audit-log.entity';

@ObjectType()
export class AuditLogPage extends Paginated(AuditLogEntry) {}
