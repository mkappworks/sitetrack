import DataLoader from 'dataloader';
import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

// Batches Material.project lookups: 50 materials referencing 10 distinct
// projects becomes ONE `WHERE id IN (...)` query instead of 50.
@Injectable({ scope: Scope.REQUEST })
export class ProjectByIdLoader extends DataLoader<string, Project> {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
  ) {
    super(async (ids: readonly string[]) => {
      const projects = await projectsRepo.find({ where: { id: In([...ids]) } });
      const byId = new Map(projects.map((p) => [p.id, p]));
      // Preserve input order; for missing ids return an Error so DataLoader
      // rejects only that key, not the whole batch.
      return ids.map(
        (id) => byId.get(id) ?? new Error(`Project ${id} not found`),
      );
    });
  }
}
