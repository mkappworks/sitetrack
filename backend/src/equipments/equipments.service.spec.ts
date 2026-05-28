import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { type ObjectLiteral, Repository } from "typeorm";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { EquipmentsService } from "./equipments.service";
import { Equipment } from "./entities/equipment.entity";
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

const mockEquipment: Equipment = {
  id: "equipment-1",
  name: "Excavator",
  managerId: "manager-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("EquipmentsService", () => {
  let equipmentsService: EquipmentsService;
  let equipmentRepo: MockRepository<Equipment>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentsService,
        {
          provide: getRepositoryToken(Equipment),
          useValue: createMockRepository<Equipment>(),
        },
      ],
    }).compile();

    equipmentsService = module.get<EquipmentsService>(EquipmentsService);
    equipmentRepo = module.get(getRepositoryToken(Equipment));
  });

  describe("findOne", () => {
    it("returns equipment when found", async () => {
      equipmentRepo.findOne!.mockResolvedValue(mockEquipment);
      const result = await equipmentsService.findOne("equipment-1");
      expect(result).toEqual(mockEquipment);
      expect(equipmentRepo.findOne).toHaveBeenCalledWith({
        where: { id: "equipment-1" },
        relations: { manager: true },
      });
    });

    it("throws NotFoundException when equipment does not exist", async () => {
      equipmentRepo.findOne!.mockResolvedValue(null);
      await expect(equipmentsService.findOne("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("admin creates equipment; managerId stays undefined when not provided", async () => {
      const input = { name: "Crane" };
      const created = { ...mockEquipment, name: input.name, managerId: undefined };
      equipmentRepo.create!.mockReturnValue(created);
      equipmentRepo.save!.mockResolvedValue(created);

      const result = await equipmentsService.create(input, mockAdmin);

      expect(equipmentRepo.create).toHaveBeenCalledWith({
        ...input,
        managerId: undefined,
      });
      expect(equipmentRepo.save).toHaveBeenCalledTimes(1);
      expect(result.name).toBe("Crane");
    });

    it("manager creating equipment auto-assigns themselves as managerId", async () => {
      const input = { name: "Bulldozer" };
      const created = {
        ...mockEquipment,
        name: input.name,
        managerId: "manager-1",
      };
      equipmentRepo.create!.mockReturnValue(created);
      equipmentRepo.save!.mockResolvedValue(created);

      await equipmentsService.create(input, mockManager);

      expect(equipmentRepo.create).toHaveBeenCalledWith({
        ...input,
        managerId: "manager-1",
      });
    });

    it("explicit managerId in input takes precedence over auto-assignment", async () => {
      const input = { name: "Loader", managerId: "other-manager" };
      const created = { ...mockEquipment, ...input };
      equipmentRepo.create!.mockReturnValue(created);
      equipmentRepo.save!.mockResolvedValue(created);

      await equipmentsService.create(input, mockManager);

      expect(equipmentRepo.create).toHaveBeenCalledWith({
        ...input,
        managerId: "other-manager",
      });
    });
  });

  describe("update", () => {
    it("allows admin to update any equipment", async () => {
      equipmentRepo.findOne!.mockResolvedValue({ ...mockEquipment });
      equipmentRepo.save!.mockResolvedValue({
        ...mockEquipment,
        name: "Updated",
      });

      const result = await equipmentsService.update(
        "equipment-1",
        { name: "Updated" },
        mockAdmin,
      );
      expect(result.name).toBe("Updated");
    });

    it("allows manager to update their own equipment", async () => {
      equipmentRepo.findOne!.mockResolvedValue({ ...mockEquipment });
      equipmentRepo.save!.mockResolvedValue({
        ...mockEquipment,
        name: "Updated",
      });

      await expect(
        equipmentsService.update(
          "equipment-1",
          { name: "Updated" },
          mockManager,
        ),
      ).resolves.not.toThrow();
    });

    it("throws ForbiddenException when manager tries to update another manager's equipment", async () => {
      const otherManagerEquipment = {
        ...mockEquipment,
        managerId: "other-manager",
      };
      equipmentRepo.findOne!.mockResolvedValue(otherManagerEquipment);

      await expect(
        equipmentsService.update(
          "equipment-1",
          { name: "Hacked" },
          mockManager,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("skips undefined DTO fields so partial updates don't clobber columns", async () => {
      const original = { ...mockEquipment, description: "Original desc" };
      equipmentRepo.findOne!.mockResolvedValue(original);
      equipmentRepo.save!.mockImplementation(async (e: Equipment) => e);

      // description is undefined — must not overwrite "Original desc" with undefined
      const result = await equipmentsService.update(
        "equipment-1",
        { name: "New Name", description: undefined },
        mockAdmin,
      );

      expect(result.name).toBe("New Name");
      expect(result.description).toBe("Original desc");
    });
  });

  describe("remove", () => {
    it("admin can remove any equipment", async () => {
      equipmentRepo.findOne!.mockResolvedValue({ ...mockEquipment });
      equipmentRepo.softRemove!.mockResolvedValue({ ...mockEquipment });

      const result = await equipmentsService.remove("equipment-1", mockAdmin);

      expect(result).toBe(true);
      expect(equipmentRepo.softRemove).toHaveBeenCalledTimes(1);
    });

    it("throws ForbiddenException when manager tries to remove another's equipment", async () => {
      const otherManagerEquipment = {
        ...mockEquipment,
        managerId: "other-manager",
      };
      equipmentRepo.findOne!.mockResolvedValue(otherManagerEquipment);

      await expect(
        equipmentsService.remove("equipment-1", mockManager),
      ).rejects.toThrow(ForbiddenException);
      expect(equipmentRepo.softRemove).not.toHaveBeenCalled();
    });
  });

  describe("findAll (paginated)", () => {
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
        getManyAndCount: jest.fn().mockResolvedValue([[mockEquipment], 1]),
      };
      equipmentRepo.createQueryBuilder!.mockReturnValue(queryBuilder);
    });

    it("admin sees all equipment, paginated, with total count, no filters when search empty", async () => {
      const result = await equipmentsService.findAll(mockAdmin, { limit: 20, offset: 0 });

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        items: [mockEquipment],
        total: 1,
        limit: 20,
        offset: 0,
      });
    });

    it("manager only sees equipment they manage (filter applied before pagination)", async () => {
      await equipmentsService.findAll(mockManager, { limit: 5, offset: 10 });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "equipment.managerId = :userId",
        { userId: "manager-1" },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(5);
      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    });

    it("search adds a case-insensitive LIKE filter on equipment.name (and trims whitespace)", async () => {
      await equipmentsService.findAll(
        mockAdmin,
        { limit: 20, offset: 0 },
        "  Excavator  ",
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "LOWER(equipment.name) LIKE LOWER(:search)",
        { search: "%Excavator%" },
      );
    });

    it("ignores empty / whitespace-only search (no filter added)", async () => {
      await equipmentsService.findAll(mockAdmin, { limit: 20, offset: 0 }, "   ");

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it("combines manager filter AND search when both apply", async () => {
      await equipmentsService.findAll(
        mockManager,
        { limit: 20, offset: 0 },
        "Crane",
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        1,
        "equipment.managerId = :userId",
        { userId: "manager-1" },
      );
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
        2,
        "LOWER(equipment.name) LIKE LOWER(:search)",
        { search: "%Crane%" },
      );
    });
  });
});
