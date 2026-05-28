// E2E: createWithMaterials issues a real Postgres ROLLBACK on a failed write.
// Requires docker-compose Postgres up; uses a separate `sitetrack_test` DB.
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { ProjectsService } from '../src/projects/projects.service';
import { Project } from '../src/projects/entities/project.entity';
import { Material } from '../src/materials/entities/material.entity';
import { User, UserRole } from '../src/users/entities/user.entity';

const TEST_DB = 'sitetrack_test';
const PG_CONFIG = {
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'sitetrack',
  password: process.env.DB_PASSWORD ?? 'sitetrack_dev',
};

// admin's managerId stays null — no FK to satisfy, no user row needed.
const admin = { id: 'admin-1', role: UserRole.ADMIN } as User;

// CREATE DATABASE can't run in a transaction, so use a temp DataSource against
// the default `postgres` DB. Ignore 42P04 (already exists).
async function ensureTestDatabase(): Promise<void> {
  const bootstrap = new DataSource({
    type: 'postgres',
    ...PG_CONFIG,
    database: 'postgres',
  });
  await bootstrap.initialize();
  try {
    await bootstrap.query(`CREATE DATABASE ${TEST_DB}`);
  } catch (err: unknown) {
    if ((err as { code?: string }).code !== '42P04') throw err;
  } finally {
    await bootstrap.destroy();
  }
}

describe('ProjectsService.createWithMaterials (real Postgres)', () => {
  let module: TestingModule;
  let service: ProjectsService;
  let dataSource: DataSource;

  beforeAll(async () => {
    await ensureTestDatabase();

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          ...PG_CONFIG,
          database: TEST_DB,
          synchronize: true,
          dropSchema: true,
          entities: [join(__dirname, '..', 'src', '**', '*.entity.{ts,js}')],
        }),
        TypeOrmModule.forFeature([Project, Material]),
      ],
      providers: [ProjectsService],
    }).compile();

    service = module.get(ProjectsService);
    dataSource = module.get(DataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await module?.close();
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE "materials", "projects" RESTART IDENTITY CASCADE');
  });

  it('persists project AND materials when every insert succeeds', async () => {
    const project = await service.createWithMaterials(
      { name: 'Happy Site' },
      [
        { name: 'Cement', quantity: 100, unit: 'kg' },
        { name: 'Rebar', quantity: 50, unit: 'm' },
      ],
      admin,
    );

    const projectRows = await dataSource.query(
      `SELECT id, name FROM "projects" WHERE id = $1`,
      [project.id],
    );
    const materialRows = await dataSource.query(
      `SELECT name, project_id FROM "materials" WHERE project_id = $1 ORDER BY name`,
      [project.id],
    );

    expect(projectRows).toHaveLength(1);
    expect(projectRows[0].name).toBe('Happy Site');
    expect(materialRows).toHaveLength(2);
    expect(materialRows.map((m: { name: string }) => m.name)).toEqual(['Cement', 'Rebar']);
  });

  it('Postgres rolls back the project insert when a later material insert violates a column constraint', async () => {
    // 300 chars overflows materials.name (varchar(255)) — Postgres rejects
    // AFTER the project row inserted in the same transaction.
    const tooLongName = 'X'.repeat(300);

    await expect(
      service.createWithMaterials(
        { name: 'Doomed Site' },
        [{ name: tooLongName, quantity: 1, unit: 'kg' }],
        admin,
      ),
    ).rejects.toThrow(/too long for type character varying/);

    const projects = await dataSource.query(
      `SELECT id FROM "projects" WHERE name = $1`,
      ['Doomed Site'],
    );
    const materials = await dataSource.query(`SELECT id FROM "materials"`);

    expect(projects).toEqual([]);
    expect(materials).toEqual([]);
  });
});
