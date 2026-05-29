import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { DataSource, IsNull, Not, Repository } from "typeorm";
import { CreateEquipmentInput } from "./dto/create-equipment.input";
import { UpdateEquipmentInput } from "./dto/update-equipment.input";
import { EquipmentPage } from "./dto/equipment-page.type";
import { Equipment } from "./entities/equipment.entity";
import { PaginationArgs } from "../common/pagination/paginated.type";
import { User, UserRole } from "../users/entities/user.entity";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";

@Injectable()
export class EquipmentsService {
  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    // @Optional so unit specs construct without the AuditModule wired.
    @Optional()
    private readonly audit?: AuditService,
  ) {}

  private actorOf(user: User) {
    return { id: user.id, email: user.email };
  }

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

  async findAll(
    user: User,
    pagination: PaginationArgs,
    search?: string | null,
  ): Promise<EquipmentPage> {
    const qb = this.equipmentRepo
      .createQueryBuilder("equipment")
      .leftJoinAndSelect("equipment.manager", "manager")
      .orderBy("equipment.createdAt", "DESC");

    // Filter MUST be applied before take/skip so total reflects only the
    // manager's rows, not the global table.
    if (user.role === UserRole.MANAGER) {
      qb.andWhere("equipment.managerId = :userId", { userId: user.id });
    }

    const trimmedSearch = search?.trim();
    if (trimmedSearch) {
      qb.andWhere("LOWER(equipment.name) LIKE LOWER(:search)", {
        search: `%${trimmedSearch}%`,
      });
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
    // See projects.service.update: clear the stale loaded relation so save()
    // respects the new managerId FK instead of reverting it.
    equipment.manager = undefined;
    return this.equipmentRepo.save(equipment);
  }

  async remove(id: string, currentUser: User): Promise<boolean> {
    const equipment = await this.findOne(id);
    this.assertCanModify(equipment, currentUser);
    await this.dataSource.transaction(async (manager) => {
      await manager.softRemove(equipment);
      await this.audit?.recordTx(manager, {
        action: AuditAction.EQUIPMENT_SOFT_DELETED,
        actor: this.actorOf(currentUser),
        targetType: "Equipment",
        targetId: equipment.id,
        targetLabel: equipment.name,
      });
    });
    return true;
  }

  async findDeleted(): Promise<Equipment[]> {
    return this.equipmentRepo.find({
      where: { deletedAt: Not(IsNull()) },
      withDeleted: true,
      relations: { manager: true },
      order: { deletedAt: "DESC" },
    });
  }

  async restore(id: string, actor?: User): Promise<Equipment> {
    return this.dataSource.transaction(async (manager) => {
      await manager.restore(Equipment, id);
      const equipment = await manager.findOne(Equipment, {
        where: { id },
        relations: { manager: true },
      });
      if (!equipment) throw new NotFoundException(`Equipment ${id} not found after restore`);
      await this.audit?.recordTx(manager, {
        action: AuditAction.EQUIPMENT_RESTORED,
        actor: actor ? this.actorOf(actor) : null,
        targetType: "Equipment",
        targetId: equipment.id,
        targetLabel: equipment.name,
      });
      return equipment;
    });
  }

  async purge(id: string, actor?: User): Promise<boolean> {
    const equipment = await this.equipmentRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!equipment) throw new NotFoundException(`Equipment ${id} not found`);
    if (!equipment.deletedAt) {
      throw new BadRequestException("Cannot purge active equipment; soft-delete it first");
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Equipment, id);
      await this.audit?.recordTx(manager, {
        action: AuditAction.EQUIPMENT_PURGED,
        actor: actor ? this.actorOf(actor) : null,
        targetType: "Equipment",
        targetId: equipment.id,
        targetLabel: equipment.name,
      });
    });
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
