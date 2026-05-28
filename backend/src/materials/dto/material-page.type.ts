import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/pagination/paginated.type';
import { Material } from '../entities/material.entity';

@ObjectType()
export class MaterialPage extends Paginated(Material) {}
