import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken, getDataSourceToken } from "@nestjs/typeorm";
import { DataSource, EntityManager, type ObjectLiteral, Repository } from "typeorm";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { Project, ProjectStatus } from "./entities/project.entity";
import { Material } from "../materials/entities/material.entity";
import { User, UserRole } from "../users/entities/user.entity";

// Helper to create a typed mock of a TypeORM repository
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
  // Fake EntityManager that mirrors create/save — exposed so tests can stub
  // the per-call return values and assert that writes went through it.
  let txnManager: { create: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    txnManager = {
      create: jest.fn((_entity: unknown, data: object) => ({ ...data })),
      save: jest.fn(),
    };
    // DataSource.transaction(cb) invokes cb with a transactional EntityManager
    // and propagates exceptions — that's the contract our service relies on.
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
      projectsRepo.remove!.mockResolvedValue({ ...mockProject });

      const result = await projectService.remove("project-1", mockAdmin);

      expect(result).toBe(true);
      expect(projectsRepo.remove).toHaveBeenCalledTimes(1);
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
      expect(projectsRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe("findAll (paginated)", () => {
    let queryBuilder: {
      leftJoinAndSelect: jest.Mock;
      orderBy: jest.Mock;
      where: jest.Mock;
      take: jest.Mock;
      skip: jest.Mock;
      getManyAndCount: jest.Mock;
    };

    beforeEach(() => {
      queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        // [items, totalCount] tuple
        getManyAndCount: jest.fn().mockResolvedValue([[mockProject], 1]),
      };
      projectsRepo.createQueryBuilder!.mockReturnValue(queryBuilder);
    });

    it("admin sees all projects, paginated, with total count", async () => {
      const result = await projectService.findAll(mockAdmin, { limit: 20, offset: 0 });

      expect(queryBuilder.where).not.toHaveBeenCalled();
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

      expect(queryBuilder.where).toHaveBeenCalledWith(
        "project.managerId = :userId",
        { userId: "manager-1" },
      );
      // Filter is applied BEFORE take/skip so count reflects only the manager's rows.
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(40);
    });
  });

  describe("createWithMaterials", () => {
    it("creates a project and its materials atomically through the same transactional manager", async () => {
      // First save = project (returns row with id stamped on it).
      // Second save = materials array (children link via projectId).
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

      // The whole flow ran inside ONE transaction call
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      // Both saves used the SAME (transactional) manager
      expect(txnManager.save).toHaveBeenCalledTimes(2);
      // Default repo was NOT used — proves nothing escaped the transaction
      expect(projectsRepo.save).not.toHaveBeenCalled();
      // Materials carry the parent project's id (set after first save resolved)
      const materialsArg = txnManager.save.mock.calls[1][0] as Material[];
      expect(materialsArg).toHaveLength(2);
      expect(materialsArg.every((m) => m.projectId === "project-1")).toBe(true);
      expect(result.id).toBe("project-1");
    });

    it("rolls back: when the materials save throws, the caller receives the error and no write escapes the transaction", async () => {
      // Project save succeeds; materials save fails mid-transaction.
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

      // The proof: every write was routed through the transactional `manager`
      // (no escape to `this.projectsRepo`). TypeORM's transaction() catches the
      // throw and issues ROLLBACK, so the project row never commits.
      expect(txnManager.save).toHaveBeenCalledTimes(2);
      expect(projectsRepo.save).not.toHaveBeenCalled();
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });
});
