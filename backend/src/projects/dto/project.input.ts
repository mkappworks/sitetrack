import { InputType, Field, ID, Float } from '@nestjs/graphql';
import {
  IsString, MinLength, IsEnum, IsOptional, IsUUID, IsDateString,
  IsNumber, Min, ArrayMinSize, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus } from '../entities/project.entity';
import { MaterialStatus } from '../../materials/entities/material.entity';

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

// Material fields without projectId — that's stamped on by the service after
// the parent project's row is created inside the same transaction.
@InputType()
export class CreateProjectMaterialInput {
  @Field() @IsString() name: string;
  @Field(() => Float) @IsNumber() @Min(0) quantity: number;
  @Field() @IsString() unit: string;
  @Field(() => MaterialStatus, { nullable: true })
  @IsEnum(MaterialStatus) @IsOptional()
  status?: MaterialStatus;
}

// Bundles a project + its initial materials into one atomic mutation.
@InputType()
export class CreateProjectWithMaterialsInput extends CreateProjectInput {
  // ValidateNested + @Type are both required for class-validator to recurse
  // into the array; without @Type it sees a plain object array and skips the
  // per-item rules above.
  @Field(() => [CreateProjectMaterialInput])
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CreateProjectMaterialInput)
  materials: CreateProjectMaterialInput[];
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
