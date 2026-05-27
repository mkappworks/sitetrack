import DataLoader from 'dataloader';
import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Material } from '../../materials/entities/material.entity';

/**
 * DataLoader prevents N+1 queries when resolving materials for many projects.
 *
 * Without DataLoader: Fetching 20 projects triggers 20 separate
 *   SELECT * FROM materials WHERE project_id = $1 queries.
 *
 * With DataLoader: All 20 project IDs are batched into a single:
 *   SELECT * FROM materials WHERE project_id IN ($1, $2, ..., $20)
 *
 * Scope.REQUEST means a new loader is created per GraphQL request,
 * so the per-request cache doesn't leak between users.
 */
@Injectable({ scope: Scope.REQUEST })
export class MaterialsByProjectLoader extends DataLoader<string, Material[]> {
  constructor(
    @InjectRepository(Material)
    private readonly materialsRepo: Repository<Material>,
  ) {
    super(async (projectIds: readonly string[]) => {
      // Single batched query for all project IDs
      const materials = await this.materialsRepo.find({
        where: { projectId: In([...projectIds]) },
        order: { createdAt: 'ASC' },
      });

      // Group by projectId so DataLoader can match results to keys
      const grouped = new Map<string, Material[]>();
      for (const projectId of projectIds) {
        grouped.set(projectId, []);
      }
      for (const material of materials) {
        const list = grouped.get(material.projectId) ?? [];
        list.push(material);
        grouped.set(material.projectId, list);
      }

      // Return results in the SAME ORDER as the input keys — DataLoader requirement
      return projectIds.map((id) => grouped.get(id) ?? []);
    });
  }
}
