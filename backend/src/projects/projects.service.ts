import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import {
  CreateProjectInput,
  CreateProjectMaterialInput,
  UpdateProjectInput,
} from './dto/project.input';
import { ProjectPage } from './dto/project-page.type';
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

  async findAll(user: User, pagination: PaginationArgs): Promise<ProjectPage> {
    const qb = this.projectsRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.manager', 'manager')
      .orderBy('project.createdAt', 'DESC');

    // Filter MUST be applied before take/skip so total reflects only the
    // manager's rows, not the global table.
    if (user.role === UserRole.MANAGER) {
      qb.where('project.managerId = :userId', { userId: user.id });
    }

    const [items, total] = await qb
      .take(pagination.limit)
      .skip(pagination.offset)
      .getManyAndCount();

    return { items, total, limit: pagination.limit, offset: pagination.offset };
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
    return this.projectsRepo.save(project);
  }

  async remove(id: string, currentUser: User): Promise<boolean> {
    const project = await this.findOne(id);
    this.assertCanModify(project, currentUser);
    await this.projectsRepo.remove(project);
    return true;
  }

  private assertCanModify(project: Project, user: User): void {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.MANAGER && project.managerId === user.id) return;
    throw new ForbiddenException('You do not have permission to modify this project');
  }
}
