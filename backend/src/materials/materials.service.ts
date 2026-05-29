import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Material } from './entities/material.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { InputType, Field, Float } from '@nestjs/graphql';
import { IsString, IsNumber, IsEnum, IsUUID, IsOptional, Min } from 'class-validator';
import { MaterialStatus } from './entities/material.entity';
import { MaterialPage } from './dto/material-page.type';
import { PaginationArgs } from '../common/pagination/paginated.type';

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
    @InjectDataSource()
    private readonly dataSource: DataSource,
    // @Optional so unit specs construct without the AuditModule.
    @Optional()
    private readonly audit?: AuditService,
  ) {}

  async findByProject(
    projectId: string,
    pagination: PaginationArgs,
  ): Promise<MaterialPage> {
    const [items, total] = await this.materialsRepo.findAndCount({
      where: { projectId },
      order: { createdAt: 'ASC' },
      take: pagination.limit,
      skip: pagination.offset,
    });
    return { items, total, limit: pagination.limit, offset: pagination.offset };
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
    // ValidationPipe + useDefineForClassFields materializes optional fields
    // as own `undefined`; skip them so partial updates don't null columns.
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) (m as any)[key] = value;
    }
    return this.materialsRepo.save(m);
  }

  async remove(id: string, actor?: User): Promise<boolean> {
    const material = await this.findOne(id);
    await this.dataSource.transaction(async (manager) => {
      await manager.softRemove(material);
      await this.audit?.recordTx(manager, {
        action: AuditAction.MATERIAL_DELETED,
        actor: actor ? { id: actor.id, email: actor.email } : null,
        targetType: 'Material',
        targetId: material.id,
        targetLabel: material.name,
      });
    });
    return true;
  }
}
