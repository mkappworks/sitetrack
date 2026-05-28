import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/pagination/paginated.type';
import { Project } from '../entities/project.entity';

@ObjectType()
export class ProjectPage extends Paginated(Project) {}
