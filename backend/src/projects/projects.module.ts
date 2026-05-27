import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Material } from '../materials/entities/material.entity';
import { ProjectsService } from './projects.service';
import { ProjectsResolver } from './projects.resolver';
import { ProjectMaterialsResolver } from './project-materials.resolver';
import { MaterialsByProjectLoader } from './loaders/material.loader';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Material]),
  ],
  providers: [
    ProjectsService,
    ProjectsResolver,
    // REQUEST-scoped resolver hosts the materials field resolver
    // (split from ProjectsResolver so @Subscription stays singleton)
    ProjectMaterialsResolver,
    // REQUEST-scoped DataLoader — a new instance per incoming request
    MaterialsByProjectLoader,
  ],
})
export class ProjectsModule {}
