import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, MinLength, IsEnum, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ProjectStatus } from '../entities/project.entity';

@InputType()
export class CreateProjectInput {
  @Field()
  @IsString()
  @MinLength(3)
  name: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  location?: string;

  @Field(() => ProjectStatus, { nullable: true })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  managerId?: string;

  @Field({ nullable: true })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @Field({ nullable: true })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

@InputType()
export class UpdateProjectInput {
  @Field({ nullable: true })
  @IsString()
  @MinLength(3)
  @IsOptional()
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  location?: string;

  @Field(() => ProjectStatus, { nullable: true })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  managerId?: string;
}
