import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { Material } from './entities/material.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectByIdLoader } from './loaders/project.loader';

// Split from MaterialsResolver because ProjectByIdLoader is REQUEST-scoped and
// scope-bubbles to any class that injects it. Same pattern as
// ProjectMaterialsResolver — see the comment there for full rationale.
@Resolver(() => Material)
export class MaterialProjectResolver {
  constructor(private readonly projectLoader: ProjectByIdLoader) {}

  @ResolveField(() => Project)
  project(@Parent() material: Material): Promise<Project> {
    return this.projectLoader.load(material.projectId);
  }
}
