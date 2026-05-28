import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { User } from './entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectsByManagerLoader } from './loaders/projects-by-manager.loader';

// Split from UsersResolver: REQUEST-scoped loader would scope-bubble it.
@Resolver(() => User)
export class UserProjectsResolver {
  constructor(private readonly loader: ProjectsByManagerLoader) {}

  @ResolveField(() => [Project])
  projects(@Parent() user: User): Promise<Project[]> {
    return this.loader.load(user.id);
  }
}
