import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserInput, UpdateUserInput } from './dto/user.input';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const existing = await this.usersRepo.findOne({ where: { email: input.email } });
    if (existing) throw new ConflictException(`Email ${input.email} is already registered`);

    const user = this.usersRepo.create({
      email: input.email,
      name: input.name,
      passwordHash: input.password, // BeforeInsert hook hashes this
      role: input.role,
    });
    return this.usersRepo.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find({ order: { createdAt: 'DESC' } });
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
    // Used by DataLoader — batch-fetch many users in a single query
    return this.usersRepo.findBy({ id: In(ids) });
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const user = await this.findOne(id);
    // ValidationPipe transform + useDefineForClassFields materializes optional
    // DTO fields as own `undefined`; skip them so partial updates don't null
    // out unchanged columns. See projects.service.ts:update for full context.
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
