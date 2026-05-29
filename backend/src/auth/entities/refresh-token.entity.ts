import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// Persisted refresh-token record. The raw token NEVER lives here — only its
// sha256 hash. A DB leak alone cannot replay sessions.
//
// Rotation chain: every refresh issues a new row and marks the old one
// `revokedAt = now`, `replacedByTokenId = newRow.id`. `familyId` is the id
// of the first token in the chain — used to revoke an entire session when
// a previously-rotated token is presented again (reuse = theft canary).
@Entity('refresh_tokens')
@Index('IX_refresh_tokens_token_hash', ['tokenHash'])
@Index('IX_refresh_tokens_family_id', ['familyId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // sha256 hex of the raw token. Unique across the table so the hash itself
  // is the lookup key and a collision (vanishingly unlikely) can't conflate
  // two tokens.
  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash: string;

  // The first token in this rotation chain. All rotated descendants share it.
  // When reuse-detection fires we revoke every row with this familyId.
  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'replaced_by_token_id', type: 'uuid', nullable: true })
  replacedByTokenId: string | null;

  // Optional fingerprint metadata — recorded on issue, useful for audit /
  // "active sessions" UI later. Nullable so existing tests don't have to
  // mock IP plumbing.
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
