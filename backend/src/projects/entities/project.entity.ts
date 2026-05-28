import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';
import { Material } from '../../materials/entities/material.entity';

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(ProjectStatus, { name: 'ProjectStatus' });

@ObjectType()
@Entity('projects')
export class Project {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ length: 255 })
  name: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Field(() => ProjectStatus)
  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.PLANNING })
  status: ProjectStatus;

  @Field({ nullable: true })
  @Column({ length: 255, nullable: true })
  location?: string;

  // Postgres `date` columns come back from the pg driver as strings
  // ("YYYY-MM-DD"), but the GraphQL DateTime scalar requires JS Date objects.
  // The read transformer bridges the gap; the write side is a no-op since
  // the driver accepts Date directly.
  // Caveat: new Date('YYYY-MM-DD') is parsed as UTC midnight — fine here, but
  // a production-grade fix would be a LocalDate scalar.
  @Field({ nullable: true })
  @Column({
    name: 'start_date',
    type: 'date',
    nullable: true,
    transformer: {
      from: (v: string | null): Date | null => (v ? new Date(v) : null),
      to: (v: Date | undefined) => v,
    },
  })
  startDate?: Date;

  @Field({ nullable: true })
  @Column({
    name: 'end_date',
    type: 'date',
    nullable: true,
    transformer: {
      from: (v: string | null): Date | null => (v ? new Date(v) : null),
      to: (v: Date | undefined) => v,
    },
  })
  endDate?: Date;

  // manager_id FK — not exposed directly in GraphQL, use manager resolver field
  @Column({ name: 'manager_id', nullable: true })
  managerId?: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, (user) => user.projects, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id' })
  manager?: User;

  // Resolved via DataLoader — see projects.resolver.ts ResolveField
  @Field(() => [Material], { nullable: true })
  @OneToMany(() => Material, (material) => material.project)
  materials?: Material[];

  // Derived field — computed via MaterialCountByProjectLoader, not stored.
  // No @Column: TypeORM ignores it. Resolver provides the value via @ResolveField.
  @Field(() => Int)
  materialCount?: number;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
