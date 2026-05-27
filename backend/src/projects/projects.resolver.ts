import {
  Resolver, Query, Mutation, Subscription, Args, ID,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { CreateProjectInput, UpdateProjectInput } from './dto/project.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

// In production, replace with Redis-backed PubSub for multi-instance support
const pubSub = new PubSub();
const PROJECT_UPDATED = 'projectUpdated';

@Resolver(() => Project)
export class ProjectsResolver {
  constructor(private readonly projectsService: ProjectsService) {}

  // --- Queries ---

  @Query(() => [Project])
  @UseGuards(JwtAuthGuard)
  projects(@CurrentUser() user: User): Promise<Project[]> {
    return this.projectsService.findAll(user);
  }

  @Query(() => Project)
  @UseGuards(JwtAuthGuard)
  project(@Args('id', { type: () => ID }) id: string): Promise<Project> {
    return this.projectsService.findOne(id);
  }

  // --- Mutations ---

  @Mutation(() => Project)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createProject(
    @Args('input') input: CreateProjectInput,
    @CurrentUser() user: User,
  ): Promise<Project> {
    return this.projectsService.create(input, user);
  }

  @Mutation(() => Project)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateProject(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateProjectInput,
    @CurrentUser() user: User,
  ): Promise<Project> {
    const updated = await this.projectsService.update(id, input, user);
    // Publish event so subscribers receive the update in real time
    await pubSub.publish(PROJECT_UPDATED, { projectUpdated: updated });
    return updated;
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  removeProject(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.projectsService.remove(id, user);
  }

  // --- Subscription ---

  @Subscription(() => Project, {
    description: 'Real-time updates when any project is modified',
  })
  projectUpdated() {
    return pubSub.asyncIterableIterator(PROJECT_UPDATED);
  }
}
