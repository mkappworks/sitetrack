import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, BeforeInsert,
} from 'typeorm';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import * as bcrypt from 'bcryptjs';
import { Project } from '../../projects/entities/project.entity';

// ── Role enum ──────────────────────────────────────────────────────────────
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  VIEWER = 'VIEWER',
}

// Register enum with GraphQL schema
registerEnumType(UserRole, { name: 'UserRole' });

// ── Entity + ObjectType ────────────────────────────────────────────────────
// @ObjectType() makes this class part of the GraphQL schema.
// @Entity() makes it a TypeORM-managed database table.
// Same class serves both purposes — no duplication needed.
@ObjectType()
@Entity('users')
export class User {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true, length: 255 })
  email: string;

  @Field()
  @Column({ length: 100 })
  name: string;

  // password_hash is NEVER exposed via GraphQL — no @Field() decorator
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Field(() => UserRole)
  @Column({ type: 'enum', enum: UserRole, default: UserRole.VIEWER })
  role: UserRole;

  @Field(() => [Project], { nullable: true })
  @OneToMany(() => Project, (project) => project.manager)
  projects?: Project[];

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Auto-hash password before persisting
  @BeforeInsert()
  async hashPassword() {
    if (this.passwordHash) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    }
  }

  async validatePassword(plain: string): Promise<boolean> {
    return bcrypt.compare(plain, this.passwordHash);
  }
}
