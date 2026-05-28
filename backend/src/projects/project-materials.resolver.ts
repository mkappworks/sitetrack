import { Resolver, ResolveField, Parent, Int } from '@nestjs/graphql';
import { Project } from './entities/project.entity';
import { Material } from '../materials/entities/material.entity';
import { MaterialsByProjectLoader } from './loaders/material.loader';
import { MaterialCountByProjectLoader } from './loaders/material-count.loader';

// Split from ProjectsResolver: the REQUEST-scoped loaders scope-bubble to any
// class that injects them, and ProjectsResolver hosts @Subscription which
// requires a singleton.
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

  @ResolveField(() => Int)
  materialCount(@Parent() project: Project): Promise<number> {
    return this.countLoader.load(project.id);
  }
}
