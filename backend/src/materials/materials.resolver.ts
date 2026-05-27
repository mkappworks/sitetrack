// materials.resolver.ts
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MaterialsService, CreateMaterialInput, UpdateMaterialInput } from './materials.service';
import { Material } from './entities/material.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Resolver(() => Material)
export class MaterialsResolver {
  constructor(private readonly materialsService: MaterialsService) {}

  @Query(() => [Material])
  @UseGuards(JwtAuthGuard)
  materialsByProject(@Args('projectId', { type: () => ID }) projectId: string): Promise<Material[]> {
    return this.materialsService.findByProject(projectId);
  }

  @Mutation(() => Material)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createMaterial(@Args('input') input: CreateMaterialInput): Promise<Material> {
    return this.materialsService.create(input);
  }

  @Mutation(() => Material)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateMaterial(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateMaterialInput,
  ): Promise<Material> {
    return this.materialsService.update(id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  removeMaterial(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.materialsService.remove(id);
  }
}
