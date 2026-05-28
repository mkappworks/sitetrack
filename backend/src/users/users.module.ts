import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { UsersSeedService } from './users-seed.service';
import { UserProjectsResolver } from './user-projects.resolver';
import { ProjectsByManagerLoader } from './loaders/projects-by-manager.loader';

@Module({
  // Project repo only — needed so the loader's @InjectRepository(Project) resolves.
  imports: [TypeOrmModule.forFeature([User, Project])],
  providers: [
    UsersService,
    UsersResolver,
    UsersSeedService,
    UserProjectsResolver,
    ProjectsByManagerLoader,
  ],
  exports: [UsersService],
})
export class UsersModule {}
