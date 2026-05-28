import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ProjectStatus } from '../entities/project.entity';

@ObjectType()
export class ProjectStatusCount {
  @Field(() => ProjectStatus)
  status: ProjectStatus;

  @Field(() => Int)
  count: number;
}
