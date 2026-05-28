import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ObjectType, Field, ID } from "@nestjs/graphql";
import { User } from "../../users/entities/user.entity";

@ObjectType()
@Entity("equipments")
export class Equipment {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Field()
  @Column({ length: 255 })
  name: string;

  @Field({ nullable: true })
  @Column({ type: "text", nullable: true })
  description?: string;

  // manager_id FK — not exposed directly in GraphQL, use manager resolver field
  @Index("idx_equipments_manager_id") // single-column index
  @Column({ name: "manager_id", nullable: true })
  managerId?: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "manager_id" })
  manager?: User;

  @Field()
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date;
}
