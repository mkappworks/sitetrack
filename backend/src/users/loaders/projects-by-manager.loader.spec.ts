import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, type ObjectLiteral, Repository } from 'typeorm';
import { ProjectsByManagerLoader } from './projects-by-manager.loader';
import { Project, ProjectStatus } from '../../projects/entities/project.entity';

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const project = (id: string, managerId: string): Project => ({
  id,
  name: id,
  status: ProjectStatus.ACTIVE,
  managerId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('ProjectsByManagerLoader', () => {
  let loader: ProjectsByManagerLoader;
  let projectsRepo: MockRepository<Project>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsByManagerLoader,
        {
          provide: getRepositoryToken(Project),
          useValue: { find: jest.fn() } satisfies MockRepository<Project>,
        },
      ],
    }).compile();

    loader = await module.resolve(ProjectsByManagerLoader);
    projectsRepo = await module.resolve(getRepositoryToken(Project));
  });

  it('batches concurrent loads into a single WHERE manager_id IN (...) query, grouped per manager', async () => {
    projectsRepo.find!.mockResolvedValue([
      project('p1', 'mgr-a'),
      project('p2', 'mgr-a'),
      project('p3', 'mgr-b'),
    ]);

    const [aProjects, bProjects] = await Promise.all([
      loader.load('mgr-a'),
      loader.load('mgr-b'),
    ]);

    expect(projectsRepo.find).toHaveBeenCalledTimes(1);
    expect(projectsRepo.find).toHaveBeenCalledWith({
      where: { managerId: In(['mgr-a', 'mgr-b']) },
      order: { createdAt: 'ASC' },
    });
    expect(aProjects.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(bProjects.map((p) => p.id)).toEqual(['p3']);
  });

  it('returns an empty array (not undefined) for a manager with no projects, preserving key order', async () => {
    projectsRepo.find!.mockResolvedValue([project('p1', 'mgr-a')]);

    const [aProjects, cProjects] = await Promise.all([
      loader.load('mgr-a'),
      loader.load('mgr-c'),
    ]);

    expect(aProjects.map((p) => p.id)).toEqual(['p1']);
    expect(cProjects).toEqual([]);
  });
});
