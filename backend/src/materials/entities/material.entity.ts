import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { ObjectType, Field, ID, Float, registerEnumType } from '@nestjs/graphql';
import { Project } from '../../projects/entities/project.entity';

export enum MaterialStatus {
  ORDERED = 'ORDERED',
  IN_TRANSIT = 'IN_TRANSIT',
  ON_SITE = 'ON_SITE',
  USED = 'USED',
  RETURNED = 'RETURNED',
}

registerEnumType(MaterialStatus, { name: 'MaterialStatus' });

@ObjectType()
@Entity('materials')
export class Material {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ length: 255 })
  name: string;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Field()
  @Column({ length: 50 })
  unit: string;  // e.g. 'kg', 'm²', 'units', 'tonnes'

  @Field(() => MaterialStatus)
  @Column({ type: 'enum', enum: MaterialStatus, default: MaterialStatus.ORDERED })
  status: MaterialStatus;

  // FK stored explicitly so the DataLoader can GROUP BY this column
  @Column({ name: 'project_id' })
  projectId: string;

  @Field(() => Project)
  @ManyToOne(() => Project, (project) => project.materials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
