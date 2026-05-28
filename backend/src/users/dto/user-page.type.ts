import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/pagination/paginated.type';
import { User } from '../entities/user.entity';

@ObjectType()
export class UserPage extends Paginated(User) {}
