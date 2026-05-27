// materials.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from './entities/material.entity';
import { InputType, Field, Float } from '@nestjs/graphql';
import { IsString, IsNumber, IsEnum, IsUUID, IsOptional, Min } from 'class-validator';
import { MaterialStatus } from './entities/material.entity';

@InputType()
export class CreateMaterialInput {
  @Field() @IsString() name: string;
  @Field(() => Float) @IsNumber() @Min(0) quantity: number;
  @Field() @IsString() unit: string;
  @Field(() => MaterialStatus, { nullable: true }) @IsEnum(MaterialStatus) @IsOptional() status?: MaterialStatus;
  @Field() @IsUUID() projectId: string;
}

@InputType()
export class UpdateMaterialInput {
  @Field({ nullable: true }) @IsString() @IsOptional() name?: string;
  @Field(() => Float, { nullable: true }) @IsNumber() @Min(0) @IsOptional() quantity?: number;
  @Field({ nullable: true }) @IsString() @IsOptional() unit?: string;
  @Field(() => MaterialStatus, { nullable: true }) @IsEnum(MaterialStatus) @IsOptional() status?: MaterialStatus;
}

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private readonly materialsRepo: Repository<Material>,
  ) {}

  async findByProject(projectId: string): Promise<Material[]> {
    return this.materialsRepo.find({ where: { projectId }, order: { createdAt: 'ASC' } });
  }

  async findOne(id: string): Promise<Material> {
    const m = await this.materialsRepo.findOne({ where: { id } });
    if (!m) throw new NotFoundException(`Material ${id} not found`);
    return m;
  }

  async create(input: CreateMaterialInput): Promise<Material> {
    return this.materialsRepo.save(this.materialsRepo.create(input));
  }

  async update(id: string, input: UpdateMaterialInput): Promise<Material> {
    const m = await this.findOne(id);
    // ValidationPipe transform + useDefineForClassFields materializes optional
    // DTO fields as own `undefined`; skip them so partial updates don't null
    // out unchanged columns. See projects.service.ts:update for full context.
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) (m as any)[key] = value;
    }
    return this.materialsRepo.save(m);
  }

  async remove(id: string): Promise<boolean> {
    await this.materialsRepo.remove(await this.findOne(id));
    return true;
  }
}
