import { Resolver, ResolveField, Parent, Int } from '@nestjs/graphql';
import { Project } from './entities/project.entity';
import { Material } from '../materials/entities/material.entity';
import { MaterialsByProjectLoader } from './loaders/material.loader';
import { MaterialCountByProjectLoader } from './loaders/material-count.loader';

/**
 * Field resolver split from ProjectsResolver because MaterialsByProjectLoader
 * is REQUEST-scoped — and NestJS scope-bubbles any class that injects it.
 * ProjectsResolver hosts @Subscription() which requires a singleton, so the
 * field resolver lives here instead.
 */
@Resolver(() => Project)
export class ProjectMaterialsResolver {
  constructor(
    private readonly materialsLoader: MaterialsByProjectLoader,
    private readonly countLoader: MaterialCountByProjectLoader,
  ) {}

  @ResolveField(() => [Material])
  materials(@Parent() project: Project): Promise<Material[]> {
    return this.materialsLoader.load(project.id);
  }

  // materialCount lets list views render "📦 N materials" without selecting
  // the full materials array — one batched COUNT query per request instead.
  @ResolveField(() => Int)
  materialCount(@Parent() project: Project): Promise<number> {
    return this.countLoader.load(project.id);
  }
}
