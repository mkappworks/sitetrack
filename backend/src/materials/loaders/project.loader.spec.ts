import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, type ObjectLiteral, Repository } from 'typeorm';
import { ProjectByIdLoader } from './project.loader';
import { Project, ProjectStatus } from '../../projects/entities/project.entity';

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('ProjectByIdLoader', () => {
  let loader: ProjectByIdLoader;
  let projectsRepo: MockRepository<Project>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectByIdLoader,
        {
          provide: getRepositoryToken(Project),
          useValue: { find: jest.fn() } satisfies MockRepository<Project>,
        },
      ],
    }).compile();

    // REQUEST-scoped — module.get returns undefined; must use resolve.
    loader = await module.resolve(ProjectByIdLoader);
    projectsRepo = await module.resolve(getRepositoryToken(Project));
  });

  it('batches concurrent loads into a single WHERE id IN (...) query', async () => {
    const a: Project = { id: 'a', name: 'A', status: ProjectStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() };
    const b: Project = { id: 'b', name: 'B', status: ProjectStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() };
    projectsRepo.find!.mockResolvedValue([a, b]);

    const [resA, resB] = await Promise.all([loader.load('a'), loader.load('b')]);

    expect(projectsRepo.find).toHaveBeenCalledTimes(1);
    expect(projectsRepo.find).toHaveBeenCalledWith({ where: { id: In(['a', 'b']) } });
    expect(resA).toEqual(a);
    expect(resB).toEqual(b);
  });

  it('returns results in the same order as input keys even when the DB returns them shuffled', async () => {
    const a: Project = { id: 'a', name: 'A', status: ProjectStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() };
    const b: Project = { id: 'b', name: 'B', status: ProjectStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() };
    projectsRepo.find!.mockResolvedValue([b, a]);

    const [resA, resB] = await Promise.all([loader.load('a'), loader.load('b')]);

    expect(resA.id).toBe('a');
    expect(resB.id).toBe('b');
  });

  it('throws for a missing id rather than silently returning null', async () => {
    projectsRepo.find!.mockResolvedValue([]);
    await expect(loader.load('missing')).rejects.toThrow(/missing/);
  });
});
