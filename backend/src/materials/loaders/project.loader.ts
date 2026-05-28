import DataLoader from 'dataloader';
import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Injectable({ scope: Scope.REQUEST })
export class ProjectByIdLoader extends DataLoader<string, Project> {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
  ) {
    super(async (ids: readonly string[]) => {
      const projects = await projectsRepo.find({ where: { id: In([...ids]) } });
      const byId = new Map(projects.map((p) => [p.id, p]));
      // Return Error per missing key so DataLoader rejects only that load, not the batch.
      return ids.map(
        (id) => byId.get(id) ?? new Error(`Project ${id} not found`),
      );
    });
  }
}
