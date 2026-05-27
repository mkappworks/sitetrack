import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
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

  @Field({ nullable: true })
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  @Column({ name: 'end_date', type: 'date', nullable: true })
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

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
