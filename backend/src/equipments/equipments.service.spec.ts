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
      equipmentRepo.remove!.mockResolvedValue({ ...mockEquipment });

      const result = await equipmentsService.remove("equipment-1", mockAdmin);

      expect(result).toBe(true);
      expect(equipmentRepo.remove).toHaveBeenCalledTimes(1);
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
      expect(equipmentRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    let queryBuilder: {
      leftJoinAndSelect: jest.Mock;
      orderBy: jest.Mock;
      where: jest.Mock;
      getMany: jest.Mock;
    };

    beforeEach(() => {
      queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEquipment]),
      };
      equipmentRepo.createQueryBuilder!.mockReturnValue(queryBuilder);
    });

    it("admin sees all equipment (no where-clause filtering)", async () => {
      const result = await equipmentsService.findAll(mockAdmin);

      expect(queryBuilder.where).not.toHaveBeenCalled();
      expect(queryBuilder.getMany).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockEquipment]);
    });

    it("manager only sees equipment they manage", async () => {
      await equipmentsService.findAll(mockManager);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        "equipment.managerId = :userId",
        { userId: "manager-1" },
      );
    });
  });
});
