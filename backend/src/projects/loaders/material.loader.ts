import DataLoader from 'dataloader';
import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Material } from '../../materials/entities/material.entity';

@Injectable({ scope: Scope.REQUEST })
export class MaterialsByProjectLoader extends DataLoader<string, Material[]> {
  constructor(
    @InjectRepository(Material)
    private readonly materialsRepo: Repository<Material>,
  ) {
    super(async (projectIds: readonly string[]) => {
      const materials = await this.materialsRepo.find({
        where: { projectId: In([...projectIds]) },
        order: { createdAt: 'ASC' },
      });

      const grouped = new Map<string, Material[]>();
      for (const projectId of projectIds) {
        grouped.set(projectId, []);
      }
      for (const material of materials) {
        const list = grouped.get(material.projectId) ?? [];
        list.push(material);
        grouped.set(material.projectId, list);
      }

      // Empty array (not undefined) for keys with no rows — DataLoader requires
      // output length == input length.
      return projectIds.map((id) => grouped.get(id) ?? []);
    });
  }
}
