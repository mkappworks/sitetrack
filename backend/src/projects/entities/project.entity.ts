import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, ManyToOne, OneToMany, JoinColumn,
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

  // Postgres `date` returns strings via the pg driver; the GraphQL DateTime
  // scalar wants JS Date. Transformer bridges read-side; write accepts Date directly.
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

  @Column({ name: 'manager_id', nullable: true })
  managerId?: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, (user) => user.projects, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id' })
  manager?: User;

  // softCascade: TypeORM soft-removes materials when the parent project is
  // soft-removed via service.softRemove().
  @Field(() => [Material], { nullable: true })
  @OneToMany(() => Material, (material) => material.project, { cascade: ['soft-remove'] })
  materials?: Material[];

  // Exposed for the trash UI to show *when* a row was deleted. Default find()
  // queries already exclude soft-removed rows, so this is null for active rows.
  @Field({ nullable: true })
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  // Derived, not stored — no @Column. Resolved by @ResolveField in
  // project-materials.resolver via MaterialCountByProjectLoader.
  @Field(() => Int)
  materialCount?: number;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
