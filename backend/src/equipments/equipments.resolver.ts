import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { EquipmentsService } from "./equipments.service";
import { Equipment } from "./entities/equipment.entity";
import { CreateEquipmentInput } from "./dto/create-equipment.input";
import { UpdateEquipmentInput } from "./dto/update-equipment.input";
import { EquipmentPage } from "./dto/equipment-page.type";
import { SearchablePaginationArgs } from "../common/pagination/paginated.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { User, UserRole } from "../users/entities/user.entity";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Resolver(() => Equipment)
export class EquipmentsResolver {
  constructor(private readonly equipmentsService: EquipmentsService) {}

  // --- Queries ---

  @Query(() => EquipmentPage, { name: "equipments" })
  @UseGuards(JwtAuthGuard)
  findAll(
    @Args() args: SearchablePaginationArgs,
    @CurrentUser() user: User,
  ): Promise<EquipmentPage> {
    return this.equipmentsService.findAll(user, args, args.search);
  }

  @Query(() => Equipment, { name: "equipment" })
  @UseGuards(JwtAuthGuard)
  findOne(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<Equipment> {
    return this.equipmentsService.findOne(id);
  }

  // --- Mutations ---

  @Mutation(() => Equipment)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createEquipment(
    @Args("input") input: CreateEquipmentInput,
    @CurrentUser() user: User,
  ): Promise<Equipment> {
    return this.equipmentsService.create(input, user);
  }

  @Mutation(() => Equipment)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateEquipment(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateEquipmentInput,
    @CurrentUser() user: User,
  ): Promise<Equipment> {
    return this.equipmentsService.update(id, input, user);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  removeEquipment(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.equipmentsService.remove(id, user);
  }

  @Query(() => [Equipment], { description: "Soft-deleted equipment — Admin only" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deletedEquipments(): Promise<Equipment[]> {
    return this.equipmentsService.findDeleted();
  }

  @Mutation(() => Equipment)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  restoreEquipment(@Args("id", { type: () => ID }) id: string): Promise<Equipment> {
    return this.equipmentsService.restore(id);
  }

  @Mutation(() => Boolean, { description: "Permanently delete a soft-deleted equipment — Admin only" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  purgeEquipment(@Args("id", { type: () => ID }) id: string): Promise<boolean> {
    return this.equipmentsService.purge(id);
  }
}
