import DataLoader from 'dataloader';
import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../../materials/entities/material.entity';

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

      // pg driver returns BIGINT COUNT as a string.
      const byId = new Map(rows.map((r) => [r.projectId, Number(r.count)]));
      // Default 0 for keys absent from GROUP BY (DataLoader requires length match).
      return projectIds.map((id) => byId.get(id) ?? 0);
    });
  }
}
