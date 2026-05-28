import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type ObjectLiteral, Repository } from 'typeorm';
import { MaterialCountByProjectLoader } from './material-count.loader';
import { Material } from '../../materials/entities/material.entity';

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('MaterialCountByProjectLoader', () => {
  let loader: MaterialCountByProjectLoader;
  let queryBuilder: {
    select: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    groupBy: jest.Mock;
    getRawMany: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };
    const materialsRepo: MockRepository<Material> = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialCountByProjectLoader,
        { provide: getRepositoryToken(Material), useValue: materialsRepo },
      ],
    }).compile();

    loader = await module.resolve(MaterialCountByProjectLoader);
  });

  it('batches concurrent loads into a single GROUP BY count query', async () => {
    queryBuilder.getRawMany.mockResolvedValue([
      { projectId: 'p1', count: '5' },
      { projectId: 'p2', count: '2' },
    ]);

    const [c1, c2] = await Promise.all([
      loader.load('p1'),
      loader.load('p2'),
    ]);

    expect(queryBuilder.getRawMany).toHaveBeenCalledTimes(1);
    expect(queryBuilder.groupBy).toHaveBeenCalledWith('material.project_id');
    expect(c1).toBe(5);
    expect(c2).toBe(2);
  });

  it('returns 0 (not undefined) for a project with no materials, preserving key order', async () => {
    queryBuilder.getRawMany.mockResolvedValue([
      { projectId: 'p2', count: '3' },
    ]);

    const [c1, c2] = await Promise.all([
      loader.load('p1'),
      loader.load('p2'),
    ]);

    expect(c1).toBe(0);
    expect(c2).toBe(3);
  });
});
