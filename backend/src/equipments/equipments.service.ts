import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateEquipmentInput } from "./dto/create-equipment.input";
import { UpdateEquipmentInput } from "./dto/update-equipment.input";
import { Equipment } from "./entities/equipment.entity";
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
      // Default manager to the creating user if not specified and user is a manager
      managerId:
        input.managerId ??
        (currentUser.role === UserRole.MANAGER ? currentUser.id : undefined),
    });

    return this.equipmentRepo.save(equipment);
  }

  async findAll(user: User): Promise<Equipment[]> {
    const qb = this.equipmentRepo
      .createQueryBuilder("equipment")
      .leftJoinAndSelect("equipment.manager", "manager")
      .orderBy("equipment.createdAt", "DESC");

    // Managers/Viewers only see their own managed equipment
    if (user.role === UserRole.MANAGER) {
      qb.where("equipment.managerId = :userId", { userId: user.id });
    }

    return qb.getMany();
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
    // class-transformer (ValidationPipe transform:true) + useDefineForClassFields (ES2022+ target)
    // materializes every optional DTO field as an own `undefined` property, so a plain
    // Object.assign would clobber unchanged columns with null. Apply only the provided fields.
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
