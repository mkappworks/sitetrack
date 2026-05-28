import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken, getDataSourceToken } from "@nestjs/typeorm";
import { DataSource, EntityManager, type ObjectLiteral, Repository } from "typeorm";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { Project, ProjectStatus } from "./entities/project.entity";
import { Material } from "../materials/entities/material.entity";
import { User, UserRole } from "../users/entities/user.entity";

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;
const createMockRepository = <
  T extends ObjectLiteral,
>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  softRemove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockAdmin: User = {
  id: "admin-1",
  email: "admin@test.com",
  name: "Admin",
  role: UserRole.ADMIN,
  passwordHash: "hash",
  createdAt: new Date(),
  updatedAt: new Date(),
  hashPassword: jest.fn(),
  validatePassword: jest.fn(),
};

const mockManager: User = {
  ...mockAdmin,
  id: "manager-1",
  role: UserRole.MANAGER,
  hashPassword: jest.fn(),
  validatePassword: jest.fn(),
};

const mockProject: Project = {
  id: "project-1",
  name: "Test Site",
  status: ProjectStatus.ACTIVE,
  managerId: "manager-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ProjectsService", () => {
  let projectService: ProjectsService;
  let projectsRepo: MockRepository<Project>;
  let txnManager: { create: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    txnManager = {
      create: jest.fn((_entity: unknown, data: object) => ({ ...data })),
      save: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn((cb: (m: EntityManager) => Promise<unknown>) =>
        cb(txnManager as unknown as EntityManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: createMockRepository<Project>(),
        },
        {
          provide: getDataSourceToken(),
          useValue: dataSource as unknown as DataSource,
        },
      ],
    }).compile();

    projectService = module.get<ProjectsService>(ProjectsService);
    projectsRepo = module.get(getRepositoryToken(Project));
  });

  describe("findOne", () => {
    it("returns project when found", async () => {
      projectsRepo.findOne!.mockResolvedValue(mockProject);
      const result = await projectService.findOne("project-1");
      expect(result).toEqual(mockProject);
      expect(projectsRepo.findOne).toHaveBeenCalledWith({
        where: { id: "project-1" },
        relations: { manager: true },
      });
    });

    it("throws NotFoundException when project does not exist", async () => {
      projectsRepo.findOne!.mockResolvedValue(null);
      await expect(projectService.findOne("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("allows admin to update any project", async () => {
      projectsRepo.findOne!.mockResolvedValue({ ...mockProject });
      projectsRepo.save!.mockResolvedValue({ ...mockProject, name: "Updated" });

      const result = await projectService.update(
        "project-1",
        { name: "Updated" },
        mockAdmin,
      );
      expect(result.name).toBe("Updated");
    });

    it("allows manager to update their own project", async () => {
      projectsRepo.findOne!.mockResolvedValue({ ...mockProject });
      projectsRepo.save!.mockResolvedValue({ ...mockProject, name: "Updated" });

      await expect(
        projectService.update("project-1", { name: "Updated" }, mockManager),
      ).resolves.not.toThrow();
    });

    it("throws ForbiddenException when manager tries to update another manager's project", async () => {
      const otherManagerProject = {
        ...mockProject,
        managerId: "other-manager",
      };
      projectsRepo.findOne!.mockResolvedValue(otherManagerProject);

      await expect(
        projectService.update("project-1", { name: "Hacked" }, mockManager),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("create", () => {
    it("admin creates a project; managerId stays undefined when not provided", async () => {
      const input = { name: "New Site" };
      const created = { ...mockProject, name: input.name, managerId: undefined };
      projectsRepo.create!.mockReturnValue(created);
      projectsRepo.save!.mockResolvedValue(created);

      const result = await projectService.create(input, mockAdmin);

      expect(projectsRepo.create).toHaveBeenCalledWith({
        ...input,
        managerId: undefined,
      });
      expect(projectsRepo.save).toHaveBeenCalledTimes(1);
      expect(result.name).toBe("New Site");
    });

    it("manager creating a project auto-assigns themselves as managerId", async () => {
      const input = { name: "Manager's Site" };
      const created = { ...mockProject, name: input.name, managerId: "manager-1" };
      projectsRepo.create!.mockReturnValue(created);
      projectsRepo.save!.mockResolvedValue(created);

      await projectService.create(input, mockManager);

      expect(projectsRepo.create).toHaveBeenCalledWith({
        ...input,
        managerId: "manager-1",
      });
    });
  });

  describe("remove", () => {
    it("admin can remove any project", async () => {
      projectsRepo.findOne!.mockResolvedValue({ ...mockProject });
      projectsRepo.softRemove!.mockResolvedValue({ ...mockProject });

      const result = await projectService.remove("project-1", mockAdmin);

      expect(result).toBe(true);
      expect(projectsRepo.softRemove).toHaveBeenCalledTimes(1);
    });

    it("throws ForbiddenException when manager tries to remove another's project", async () => {
      const otherManagerProject = {
        ...mockProject,
        managerId: "other-manager",
      };
      projectsRepo.findOne!.mockResolvedValue(otherManagerProject);

      await expect(
        projectService.remove("project-1", mockManager),
      ).rejects.toThrow(ForbiddenException);
      expect(projectsRepo.softRemove).not.toHaveBeenCalled();
    });
  });

  describe("findAll (paginated + searchable)", () => {
    let queryBuilder: {
      leftJoinAndSelect: jest.Mock;
      orderBy: jest.Mock;
      andWhere: jest.Mock;
      take: jest.Mock;
      skip: jest.Mock;
      getManyAndCount: jest.Mock;
    };

    beforeEach(() => {
      queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProject], 1]),
      };
      projectsRepo.createQueryBuilder!.mockReturnValue(queryBuilder);
    });

    it("admin sees all projects, paginated, with total count, no filters when search empty", async () => {
      const result = await projectService.findAll(mockAdmin, { limit: 20, offset: 0 });

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        items: [mockProject],
        total: 1,
        limit: 20,
        offset: 0,
      });
    });

    it("manager only sees projects they manage (filter applied before pagination)", async () => {
      await projectService.findAll(mockManager, { limit: 10, offset: 40 });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "project.managerId = :userId",
        { userId: "manager-1" },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(40);
    });

    it("search adds a case-insensitive LIKE filter on project.name (and trims whitespace)", async () => {
      await projectService.findAll(
        mockAdmin,
        { limit: 20, offset: 0 },
        "  Tower  ",
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "LOWER(project.name) LIKE LOWER(:search)",
        { search: "%Tower%" },
      );
    });

    it("ignores empty / whitespace-only search (no filter added)", async () => {
      await projectService.findAll(mockAdmin, { limit: 20, offset: 0 }, "   ");

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it("combines manager filter AND search when both apply", async () => {
      await projectService.findAll(
        mockManager,
        { limit: 20, offset: 0 },
        "Phase 1",
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        "project.managerId = :userId",
        { userId: "manager-1" },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        "LOWER(project.name) LIKE LOWER(:search)",
        { search: "%Phase 1%" },
      );
    });
  });

  describe("statusCounts", () => {
    let qb: {
      select: jest.Mock;
      addSelect: jest.Mock;
      where: jest.Mock;
      groupBy: jest.Mock;
      getRawMany: jest.Mock;
    };

    beforeEach(() => {
      qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: ProjectStatus.ACTIVE, count: '14' },
          { status: ProjectStatus.PLANNING, count: '3' },
        ]),
      };
      projectsRepo.createQueryBuilder!.mockReturnValue(qb);
    });

    it("returns per-status counts globally for admin (no WHERE)", async () => {
      const result = await projectService.statusCounts(mockAdmin);

      expect(qb.where).not.toHaveBeenCalled();
      expect(qb.groupBy).toHaveBeenCalledWith('project.status');
      // pg returns BIGINT COUNT as a string; service coerces to number
      expect(result).toEqual([
        { status: ProjectStatus.ACTIVE, count: 14 },
        { status: ProjectStatus.PLANNING, count: 3 },
      ]);
    });

    it("scopes the aggregation to the manager's own projects", async () => {
      await projectService.statusCounts(mockManager);

      expect(qb.where).toHaveBeenCalledWith(
        "project.managerId = :userId",
        { userId: "manager-1" },
      );
    });
  });

  describe("createWithMaterials", () => {
    it("creates a project and its materials atomically through the same transactional manager", async () => {
      txnManager.save
        .mockImplementationOnce(async (entity: Project) => ({
          ...entity,
          id: "project-1",
        }))
        .mockImplementationOnce(async (entities: Material[]) =>
          entities.map((m, i) => ({ ...m, id: `material-${i + 1}` })),
        );

      const result = await projectService.createWithMaterials(
        { name: "New Site", status: ProjectStatus.PLANNING },
        [
          { name: "Cement", quantity: 100, unit: "kg" },
          { name: "Rebar", quantity: 50, unit: "m" },
        ],
        mockAdmin,
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(txnManager.save).toHaveBeenCalledTimes(2);
      // projectsRepo NOT used — proves no write escaped the transaction.
      expect(projectsRepo.save).not.toHaveBeenCalled();
      const materialsArg = txnManager.save.mock.calls[1][0] as Material[];
      expect(materialsArg).toHaveLength(2);
      expect(materialsArg.every((m) => m.projectId === "project-1")).toBe(true);
      expect(result.id).toBe("project-1");
    });

    it("rolls back: when the materials save throws, the caller receives the error and no write escapes the transaction", async () => {
      txnManager.save
        .mockImplementationOnce(async (entity: Project) => ({
          ...entity,
          id: "project-1",
        }))
        .mockImplementationOnce(async () => {
          throw new Error("quantity violates check constraint");
        });

      await expect(
        projectService.createWithMaterials(
          { name: "Bad Site" },
          [{ name: "Bad Material", quantity: -5, unit: "kg" }],
          mockAdmin,
        ),
      ).rejects.toThrow("quantity violates check constraint");

      expect(txnManager.save).toHaveBeenCalledTimes(2);
      expect(projectsRepo.save).not.toHaveBeenCalled();
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });
});
