import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { Project, ProjectStatus } from './entities/project.entity';
import {
  CreateProjectInput,
  CreateProjectMaterialInput,
  UpdateProjectInput,
} from './dto/project.input';
import { ProjectPage } from './dto/project-page.type';
import { ProjectStatusCount } from './dto/project-status-count.type';
import { PaginationArgs } from '../common/pagination/paginated.type';
import { Material } from '../materials/entities/material.entity';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    user: User,
    pagination: PaginationArgs,
    search?: string | null,
  ): Promise<ProjectPage> {
    const qb = this.projectsRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.manager', 'manager')
      .orderBy('project.createdAt', 'DESC');

    // Filter MUST be applied before take/skip so total reflects only the
    // manager's rows, not the global table.
    if (user.role === UserRole.MANAGER) {
      qb.andWhere('project.managerId = :userId', { userId: user.id });
    }

    const trimmedSearch = search?.trim();
    if (trimmedSearch) {
      qb.andWhere('LOWER(project.name) LIKE LOWER(:search)', {
        search: `%${trimmedSearch}%`,
      });
    }

    const [items, total] = await qb
      .take(pagination.limit)
      .skip(pagination.offset)
      .getManyAndCount();

    return { items, total, limit: pagination.limit, offset: pagination.offset };
  }

  async statusCounts(user: User): Promise<ProjectStatusCount[]> {
    const qb = this.projectsRepo
      .createQueryBuilder('project')
      .select('project.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('project.status');

    if (user.role === UserRole.MANAGER) {
      qb.where('project.managerId = :userId', { userId: user.id });
    }

    const rows = await qb.getRawMany<{ status: ProjectStatus; count: string }>();
    return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectsRepo.findOne({
      where: { id },
      relations: { manager: true },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async create(input: CreateProjectInput, currentUser: User): Promise<Project> {
    const project = this.projectsRepo.create({
      ...input,
      // Manager creating without explicit managerId auto-assigns themselves.
      managerId: input.managerId ?? (currentUser.role === UserRole.MANAGER ? currentUser.id : undefined),
    });
    return this.projectsRepo.save(project);
  }

  // Every write goes through the txn-scoped `manager`; a throw inside the
  // callback triggers ROLLBACK, so no half-created project lingers.
  async createWithMaterials(
    input: CreateProjectInput,
    materials: CreateProjectMaterialInput[],
    currentUser: User,
  ): Promise<Project> {
    return this.dataSource.transaction(async (manager) => {
      const project = manager.create(Project, {
        ...input,
        managerId:
          input.managerId ??
          (currentUser.role === UserRole.MANAGER ? currentUser.id : undefined),
      });
      const savedProject = await manager.save(project);

      const materialRows = materials.map((m) =>
        manager.create(Material, { ...m, projectId: savedProject.id }),
      );
      await manager.save(materialRows);

      return savedProject;
    });
  }

  async update(id: string, input: UpdateProjectInput, currentUser: User): Promise<Project> {
    const project = await this.findOne(id);
    this.assertCanModify(project, currentUser);
    // class-transformer (ValidationPipe transform:true) + useDefineForClassFields (ES2022+ target)
    // materializes every optional DTO field as an own `undefined` property, so a plain
    // Object.assign would clobber unchanged columns with null. Apply only the provided fields.
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) (project as any)[key] = value;
    }
    // findOne loaded `manager` as the full User object. save() prefers the
    // relation object over the FK column — without clearing it, setting
    // managerId here would be reverted on persist. Drop the stale relation.
    project.manager = undefined;
    return this.projectsRepo.save(project);
  }

  async remove(id: string, currentUser: User): Promise<boolean> {
    // softRemove stamps deleted_at via @DeleteDateColumn; default find()
    // queries filter the row out automatically. Materials cascade via
    // cascade: ['soft-remove'] on the OneToMany relation.
    const project = await this.findOne(id);
    this.assertCanModify(project, currentUser);
    await this.projectsRepo.softRemove(project);
    return true;
  }

  async findDeleted(): Promise<Project[]> {
    return this.projectsRepo.find({
      where: { deletedAt: Not(IsNull()) },
      withDeleted: true,
      relations: { manager: true },
      order: { deletedAt: 'DESC' },
    });
  }

  async restore(id: string): Promise<Project> {
    await this.projectsRepo.restore(id);
    // restore() doesn't return the row; fetch fresh with relations.
    const project = await this.projectsRepo.findOne({
      where: { id },
      relations: { manager: true },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found after restore`);
    return project;
  }

  private assertCanModify(project: Project, user: User): void {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.MANAGER && project.managerId === user.id) return;
    throw new ForbiddenException('You do not have permission to modify this project');
  }
}
