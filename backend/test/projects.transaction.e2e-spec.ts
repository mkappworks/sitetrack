// End-to-end proof that ProjectsService.createWithMaterials issues a real
// Postgres ROLLBACK when a write inside the transaction fails.
//
// Requirements:
//   - docker-compose Postgres running (see docker-compose.yml at repo root)
//   - Test creates/uses a SEPARATE database `sitetrack_test` so dev data
//     in `sitetrack` is never touched.
//
// Run:
//   cd backend && npm run test:e2e
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

// Synthetic admin — we only read `role` and `id`; admin's managerId stays null
// so we don't need to seed a real user row (no FK to satisfy).
const admin = { id: 'admin-1', role: UserRole.ADMIN } as User;

// Postgres can't CREATE DATABASE inside a transaction; open a temporary
// DataSource against the default `postgres` DB, issue the statement, ignore
// "already exists" (SQLSTATE 42P04), then close.
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
          // Sync drops/creates the schema each run — fine for an isolated test DB.
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

  // Each test runs on a clean slate so assertions about "row count" stay deterministic.
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
    // `name` is varchar(255); a 300-char string triggers a real Postgres error
    // ("value too long for type character varying(255)") AFTER the project row
    // has been inserted in the same transaction. If rollback didn't fire, the
    // project would remain in the DB and the assertion below would fail.
    const tooLongName = 'X'.repeat(300);

    await expect(
      service.createWithMaterials(
        { name: 'Doomed Site' },
        [{ name: tooLongName, quantity: 1, unit: 'kg' }],
        admin,
      ),
    ).rejects.toThrow(/too long for type character varying/);

    // The real proof: query the DB. Zero rows means Postgres rolled back.
    const projects = await dataSource.query(
      `SELECT id FROM "projects" WHERE name = $1`,
      ['Doomed Site'],
    );
    const materials = await dataSource.query(`SELECT id FROM "materials"`);

    expect(projects).toEqual([]);
    expect(materials).toEqual([]);
  });
});
