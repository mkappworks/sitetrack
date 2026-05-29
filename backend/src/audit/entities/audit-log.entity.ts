import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, registerEnumType, GraphQLISODateTime } from '@nestjs/graphql';

// Append-only record of security- and data-significant events. Destructive
// data ops + auth events. NOT every write — routine create/update is noise.
export enum AuditAction {
  // Destructive data ops
  PROJECT_SOFT_DELETED = 'PROJECT_SOFT_DELETED',
  PROJECT_RESTORED = 'PROJECT_RESTORED',
  PROJECT_PURGED = 'PROJECT_PURGED',
  EQUIPMENT_SOFT_DELETED = 'EQUIPMENT_SOFT_DELETED',
  EQUIPMENT_RESTORED = 'EQUIPMENT_RESTORED',
  EQUIPMENT_PURGED = 'EQUIPMENT_PURGED',
  MATERIAL_DELETED = 'MATERIAL_DELETED',
  // Auth events
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  REFRESH_REUSE_DETECTED = 'REFRESH_REUSE_DETECTED',
}

registerEnumType(AuditAction, { name: 'AuditAction' });

@ObjectType()
@Entity('audit_log')
@Index('IX_audit_log_created_at', ['createdAt'])
export class AuditLogEntry {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => AuditAction)
  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  // Actor id + email are denormalized snapshots: the user may be deleted
  // later, but the audit trail must still say who did it. Null for
  // unauthenticated/system events.
  @Field(() => ID, { nullable: true })
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'actor_email', type: 'varchar', length: 255, nullable: true })
  actorEmail: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'target_type', type: 'varchar', length: 50, nullable: true })
  targetType: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'target_id', type: 'varchar', length: 64, nullable: true })
  targetId: string | null;

  // Denormalized display label (e.g. project name) captured at event time —
  // survives the target's later deletion.
  @Field(() => String, { nullable: true })
  @Column({ name: 'target_label', type: 'varchar', length: 255, nullable: true })
  targetLabel: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Field(() => GraphQLISODateTime)
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
