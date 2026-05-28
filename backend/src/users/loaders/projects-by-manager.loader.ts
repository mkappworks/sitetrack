import DataLoader from 'dataloader';
import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Injectable({ scope: Scope.REQUEST })
export class ProjectsByManagerLoader extends DataLoader<string, Project[]> {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
  ) {
    super(async (managerIds: readonly string[]) => {
      const projects = await projectsRepo.find({
        where: { managerId: In([...managerIds]) },
        order: { createdAt: 'ASC' },
      });

      const grouped = new Map<string, Project[]>();
      for (const id of managerIds) grouped.set(id, []);
      for (const p of projects) {
        if (p.managerId) grouped.get(p.managerId)?.push(p);
      }

      return managerIds.map((id) => grouped.get(id) ?? []);
    });
  }
}
