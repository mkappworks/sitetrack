import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateEquipmentInput } from "./dto/create-equipment.input";
import { UpdateEquipmentInput } from "./dto/update-equipment.input";
import { EquipmentPage } from "./dto/equipment-page.type";
import { Equipment } from "./entities/equipment.entity";
import { PaginationArgs } from "../common/pagination/paginated.type";
import { User, UserRole } from "../users/entities/user.entity";

@Injectable()
export class EquipmentsService {
  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
  ) {}

  async create(input: CreateEquipmentInput, currentUser: User): Promise<Equipment> {
    const equipment = this.equipmentRepo.create({
      ...input,
      // Manager creating without explicit managerId auto-assigns themselves.
      managerId:
        input.managerId ??
        (currentUser.role === UserRole.MANAGER ? currentUser.id : undefined),
    });

    return this.equipmentRepo.save(equipment);
  }

  async findAll(user: User, pagination: PaginationArgs): Promise<EquipmentPage> {
    const qb = this.equipmentRepo
      .createQueryBuilder("equipment")
      .leftJoinAndSelect("equipment.manager", "manager")
      .orderBy("equipment.createdAt", "DESC");

    // Filter MUST be applied before take/skip so total reflects only the
    // manager's rows, not the global table.
    if (user.role === UserRole.MANAGER) {
      qb.where("equipment.managerId = :userId", { userId: user.id });
    }

    const [items, total] = await qb
      .take(pagination.limit)
      .skip(pagination.offset)
      .getManyAndCount();

    return { items, total, limit: pagination.limit, offset: pagination.offset };
  }

  async findOne(id: string): Promise<Equipment> {
    const equipment = await this.equipmentRepo.findOne({
      where: { id },
      relations: { manager: true },
    });
    if (!equipment) throw new NotFoundException(`Equipment ${id} not found`);
    return equipment;
  }

  async update(
    id: string,
    input: UpdateEquipmentInput,
    currentUser: User,
  ): Promise<Equipment> {
    const equipment = await this.findOne(id);
    this.assertCanModify(equipment, currentUser);
    // class-transformer (ValidationPipe transform:true) + useDefineForClassFields
    // materializes optional DTO fields as own `undefined` properties; Object.assign
    // would clobber unchanged columns with null. Apply only provided fields.
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) (equipment as any)[key] = value;
    }
    return this.equipmentRepo.save(equipment);
  }

  async remove(id: string, currentUser: User): Promise<boolean> {
    const equipment = await this.findOne(id);
    this.assertCanModify(equipment, currentUser);
    await this.equipmentRepo.remove(equipment);
    return true;
  }

  private assertCanModify(equipment: Equipment, user: User): void {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.MANAGER && equipment.managerId === user.id) return;
    throw new ForbiddenException(
      "You do not have permission to modify this equipment",
    );
  }
}
