import DataLoader from 'dataloader';
import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../../materials/entities/material.entity';

// Batches per-project material counts: listing 20 projects + selecting
// materialCount becomes ONE grouped count query instead of 20 COUNT(*) calls.
@Injectable({ scope: Scope.REQUEST })
export class MaterialCountByProjectLoader extends DataLoader<string, number> {
  constructor(
    @InjectRepository(Material)
    private readonly materialsRepo: Repository<Material>,
  ) {
    super(async (projectIds: readonly string[]) => {
      const rows = await materialsRepo
        .createQueryBuilder('material')
        .select('material.project_id', 'projectId')
        .addSelect('COUNT(*)', 'count')
        .where('material.project_id IN (:...projectIds)', {
          projectIds: [...projectIds],
        })
        .groupBy('material.project_id')
        .getRawMany<{ projectId: string; count: string }>();

      // Postgres COUNT returns BIGINT → driver gives us a string. Coerce here.
      const byId = new Map(rows.map((r) => [r.projectId, Number(r.count)]));
      // Default 0 for projects with no materials — they don't appear in the
      // GROUP BY result. DataLoader requires output length == input length.
      return projectIds.map((id) => byId.get(id) ?? 0);
    });
  }
}
