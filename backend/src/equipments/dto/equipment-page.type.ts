import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/pagination/paginated.type';
import { Equipment } from '../entities/equipment.entity';

@ObjectType()
export class EquipmentPage extends Paginated(Equipment) {}
