import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Material } from './entities/material.entity';
import { MaterialsService } from './materials.service';
import { MaterialsResolver } from './materials.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Material])],
  providers: [MaterialsService, MaterialsResolver],
  exports: [MaterialsService],
})
export class MaterialsModule {}
