import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { type ObjectLiteral, Repository } from "typeorm";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { User, UserRole } from "./entities/user.entity";

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;
const createMockRepository = <
  T extends ObjectLiteral,
>(): MockRepository<T> => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe("UsersService", () => {
  let userService: UsersService;
  let usersRepo: MockRepository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository<User>(),
        },
      ],
    }).compile();

    userService = module.get<UsersService>(UsersService);
    usersRepo = module.get(getRepositoryToken(User));
  });

  describe("create", () => {
    it("throws ForbiddenException when role is ADMIN, before any DB call", async () => {
      await expect(
        userService.create({
          email: "x@x.com",
          name: "X",
          password: "pw12345678",
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);

      // Critical: the guard ran before the lookup — no DB roundtrip wasted
      expect(usersRepo.findOne).not.toHaveBeenCalled();
    });

    it("creates user when role is MANAGER", async () => {
      const fakeUser = {
        id: "new-user",
        email: "x@x.com",
        name: "X",
        role: UserRole.MANAGER,
      };
      usersRepo.findOne!.mockResolvedValue(null);
      usersRepo.create!.mockReturnValue(fakeUser);
      usersRepo.save!.mockResolvedValue(fakeUser);

      const result = await userService.create({
        email: "x@x.com",
        name: "X",
        password: "pw12345678",
        role: UserRole.MANAGER,
      });

      expect(result.role).toBe(UserRole.MANAGER);
      expect(usersRepo.findOne).toHaveBeenCalledWith({
        where: { email: "x@x.com" },
      });
      expect(usersRepo.create).toHaveBeenCalledWith({
        email: "x@x.com",
        name: "X",
        passwordHash: "pw12345678",
        role: UserRole.MANAGER,
      });
      expect(usersRepo.save).toHaveBeenCalledTimes(1);
    });

    it("throws ConflictException when email already exists", async () => {
      usersRepo.findOne!.mockResolvedValue({ id: "existing" });

      await expect(
        userService.create({
          email: "x@x.com",
          name: "X",
          password: "pw12345678",
          role: UserRole.MANAGER,
        }),
      ).rejects.toThrow(ConflictException);

      expect(usersRepo.save).not.toHaveBeenCalled();
    });
  });
});
