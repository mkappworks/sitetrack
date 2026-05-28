import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { CreateUserInput, UpdateUserInput } from './dto/user.input';
import { UserPage } from './dto/user-page.type';
import { PaginationArgs } from '../common/pagination/paginated.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  // --- Queries ---

  @Query(() => UserPage, { description: 'List all users (paginated) — Admin only' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  users(@Args() pagination: PaginationArgs): Promise<UserPage> {
    return this.usersService.findAll(pagination);
  }

  @Query(() => User, { description: 'Get a specific user by ID — Admin only. Non-admins use `me` for self.' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  user(@Args('id', { type: () => ID }) id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Query(() => User, { description: 'The currently authenticated user' })
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User): User {
    return user;
  }

  @Query(() => [User], { description: 'All MANAGER-role users (for assignment dropdowns) — Admin only' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  managers(): Promise<User[]> {
    return this.usersService.findManagers();
  }

  // --- Mutations ---

  @Mutation(() => User, { description: 'Create a new user — Admin only' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createUser(@Args('input') input: CreateUserInput): Promise<User> {
    return this.usersService.create(input);
  }

  @Mutation(() => User, { description: 'Update a user — Admin only' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateUserInput,
  ): Promise<User> {
    return this.usersService.update(id, input);
  }

  @Mutation(() => Boolean, { description: 'Delete a user — Admin only' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  removeUser(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.usersService.remove(id);
  }
}
