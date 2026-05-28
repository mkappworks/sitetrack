import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Material } from './entities/material.entity';
import { Project } from '../projects/entities/project.entity';
import { MaterialsService } from './materials.service';
import { MaterialsResolver } from './materials.resolver';
import { MaterialProjectResolver } from './material-project.resolver';
import { ProjectByIdLoader } from './loaders/project.loader';

@Module({
  // Project is registered here ONLY so the loader's @InjectRepository(Project)
  // resolves — we don't expose ProjectsService from this module.
  imports: [TypeOrmModule.forFeature([Material, Project])],
  providers: [
    MaterialsService,
    MaterialsResolver,
    MaterialProjectResolver,
    ProjectByIdLoader,
  ],
  exports: [MaterialsService],
})
export class MaterialsModule {}
