import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { type ObjectLiteral, Repository } from "typeorm";
import { UsersSeedService } from "./users-seed.service";
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

describe("UsersSeedService", () => {
  let projectService: UsersSeedService;
  let usersRepo: MockRepository<User>;
  let configGet: jest.Mock;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    configGet = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersSeedService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository<User>(),
        },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    projectService = module.get<UsersSeedService>(UsersSeedService);
    usersRepo = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv; // restore between tests
    jest.clearAllMocks();
  });

  it('skips seeding when NODE_ENV is "test"', async () => {
    process.env.NODE_ENV = "test";

    await projectService.onApplicationBootstrap();

    expect(usersRepo.findOne).not.toHaveBeenCalled();
    expect(usersRepo.save).not.toHaveBeenCalled();
    expect(configGet).not.toHaveBeenCalled();
  });

  it("skips when SEED_ADMIN_EMAIL or PASSWORD is missing", async () => {
    process.env.NODE_ENV = "development";
    configGet.mockReturnValue(undefined); // both keys return undefined

    await projectService.onApplicationBootstrap();

    expect(configGet).toHaveBeenCalledTimes(2);
    expect(configGet).toHaveBeenCalledWith("SEED_ADMIN_EMAIL");
    expect(configGet).toHaveBeenCalledWith("SEED_ADMIN_PASSWORD");
    expect(usersRepo.findOne).not.toHaveBeenCalled();
    expect(usersRepo.save).not.toHaveBeenCalled();
  });

  it("skips when admin with that email already exists", async () => {
    process.env.NODE_ENV = "development";
    configGet.mockImplementation((key) =>
      key === "SEED_ADMIN_EMAIL"
        ? "admin@x.com"
        : key === "SEED_ADMIN_PASSWORD"
          ? "pw12345678"
          : undefined,
    );
    usersRepo.findOne!.mockResolvedValue({ id: "existing" }); // simulate row exists

    await projectService.onApplicationBootstrap();

    expect(usersRepo.findOne).toHaveBeenCalledWith({
      where: { email: "admin@x.com" },
    });
    expect(usersRepo.create).not.toHaveBeenCalled();
    expect(usersRepo.save).not.toHaveBeenCalled();
  });

  it("creates admin when env vars present and no existing user", async () => {
    process.env.NODE_ENV = "development";
    configGet.mockImplementation((key) =>
      key === "SEED_ADMIN_EMAIL"
        ? "admin@x.com"
        : key === "SEED_ADMIN_PASSWORD"
          ? "pw12345678"
          : undefined,
    );
    const fakeAdmin = {
      id: "new-admin",
      email: "admin@x.com",
      role: UserRole.ADMIN,
    };
    usersRepo.findOne!.mockResolvedValue(null);
    usersRepo.create!.mockReturnValue(fakeAdmin);
    usersRepo.save!.mockResolvedValue(fakeAdmin);

    await projectService.onApplicationBootstrap();

    expect(usersRepo.findOne).toHaveBeenCalledWith({
      where: { email: "admin@x.com" },
    });
    expect(usersRepo.create).toHaveBeenCalledWith({
      email: "admin@x.com",
      name: "Admin",
      passwordHash: "pw12345678",
      role: UserRole.ADMIN,
    });
    expect(usersRepo.save).toHaveBeenCalledTimes(1);
    expect(usersRepo.save).toHaveBeenCalledWith(fakeAdmin);
  });
});
