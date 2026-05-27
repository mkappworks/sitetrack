import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type ObjectLiteral, Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project, ProjectStatus } from './entities/project.entity';
import { User, UserRole } from '../users/entities/user.entity';

// Helper to create a typed mock of a TypeORM repository
type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockAdmin: User = {
  id: 'admin-1',
  email: 'admin@test.com',
  name: 'Admin',
  role: UserRole.ADMIN,
  passwordHash: 'hash',
  createdAt: new Date(),
  updatedAt: new Date(),
  hashPassword: jest.fn(),
  validatePassword: jest.fn(),
};

const mockManager: User = {
  ...mockAdmin,
  id: 'manager-1',
  role: UserRole.MANAGER,
  hashPassword: jest.fn(),
  validatePassword: jest.fn(),
};

const mockProject: Project = {
  id: 'project-1',
  name: 'Test Site',
  status: ProjectStatus.ACTIVE,
  managerId: 'manager-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepo: MockRepository<Project>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: createMockRepository<Project>(),
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectsRepo = module.get(getRepositoryToken(Project));
  });

  describe('findOne', () => {
    it('returns project when found', async () => {
      projectsRepo.findOne!.mockResolvedValue(mockProject);
      const result = await service.findOne('project-1');
      expect(result).toEqual(mockProject);
      expect(projectsRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        relations: { manager: true },
      });
    });

    it('throws NotFoundException when project does not exist', async () => {
      projectsRepo.findOne!.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('allows admin to update any project', async () => {
      projectsRepo.findOne!.mockResolvedValue({ ...mockProject });
      projectsRepo.save!.mockResolvedValue({ ...mockProject, name: 'Updated' });

      const result = await service.update('project-1', { name: 'Updated' }, mockAdmin);
      expect(result.name).toBe('Updated');
    });

    it('allows manager to update their own project', async () => {
      projectsRepo.findOne!.mockResolvedValue({ ...mockProject });
      projectsRepo.save!.mockResolvedValue({ ...mockProject, name: 'Updated' });

      await expect(
        service.update('project-1', { name: 'Updated' }, mockManager),
      ).resolves.not.toThrow();
    });

    it('throws ForbiddenException when manager tries to update another manager\'s project', async () => {
      const otherManagerProject = { ...mockProject, managerId: 'other-manager' };
      projectsRepo.findOne!.mockResolvedValue(otherManagerProject);

      await expect(
        service.update('project-1', { name: 'Hacked' }, mockManager),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
