import { Module } from "@nestjs/common";
import { EquipmentsService } from "./equipments.service";
import { EquipmentsResolver } from "./equipments.resolver";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Equipment } from "./entities/equipment.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Equipment])],
  providers: [EquipmentsResolver, EquipmentsService],
  exports: [EquipmentsService],
})
export class EquipmentsModule {}
