import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { User, UserRole } from "./entities/user.entity";
import { CreateUserInput, UpdateUserInput } from "./dto/user.input";
import { UserPage } from "./dto/user-page.type";
import { PaginationArgs } from "../common/pagination/paginated.type";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    if (input.role === UserRole.ADMIN)
      throw new ForbiddenException("Cannot create user with ADMIN role");

    const existing = await this.usersRepo.findOne({
      where: { email: input.email },
    });
    if (existing)
      throw new ConflictException(`Email ${input.email} is already registered`);

    const user = this.usersRepo.create({
      email: input.email,
      name: input.name,
      passwordHash: input.password, // BeforeInsert hook hashes this
      role: input.role,
    });
    return this.usersRepo.save(user);
  }

  async findAll(pagination: PaginationArgs): Promise<UserPage> {
    const [items, total] = await this.usersRepo.findAndCount({
      order: { createdAt: "DESC" },
      take: pagination.limit,
      skip: pagination.offset,
    });
    return { items, total, limit: pagination.limit, offset: pagination.offset };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findByIds(ids: string[]): Promise<User[]> {
    return this.usersRepo.findBy({ id: In(ids) });
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const user = await this.findOne(id);
    // ValidationPipe + useDefineForClassFields materializes optional fields
    // as own `undefined`; skip them so partial updates don't null columns.
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) (user as any)[key] = value;
    }
    return this.usersRepo.save(user);
  }

  async remove(id: string): Promise<boolean> {
    const user = await this.findOne(id);
    await this.usersRepo.remove(user);
    return true;
  }
}
