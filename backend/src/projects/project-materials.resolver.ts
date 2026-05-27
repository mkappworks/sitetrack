import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { Project } from './entities/project.entity';
import { Material } from '../materials/entities/material.entity';
import { MaterialsByProjectLoader } from './loaders/material.loader';

/**
 * Field resolver split from ProjectsResolver because MaterialsByProjectLoader
 * is REQUEST-scoped — and NestJS scope-bubbles any class that injects it.
 * ProjectsResolver hosts @Subscription() which requires a singleton, so the
 * field resolver lives here instead.
 */
@Resolver(() => Project)
export class ProjectMaterialsResolver {
  constructor(private readonly materialsLoader: MaterialsByProjectLoader) {}

  @ResolveField(() => [Material])
  materials(@Parent() project: Project): Promise<Material[]> {
    return this.materialsLoader.load(project.id);
  }
}
