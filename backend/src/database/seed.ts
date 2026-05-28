// Seed the development database with enough realistic data to exercise
// pagination, filters, and relationships.
//
// Idempotent: skips if user count already > 5 (the admin + a handful is the
// signal that we've seeded before). Drop the test DB or `TRUNCATE` manually
// if you want a fresh seed.
//
// Run (docker-compose Postgres must be up):
//   cd backend && npm run seed
//
// Or inside the container:
//   docker compose exec backend npm run seed
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { User, UserRole } from '../users/entities/user.entity';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { Equipment } from '../equipments/entities/equipment.entity';
import { Material, MaterialStatus } from '../materials/entities/material.entity';

// ── Data pools ────────────────────────────────────────────────────────────
const FIRST_NAMES = [
  'Sarah', 'Mike', 'Aisha', 'Carlos', 'Jordan', 'Priya', 'Liam', 'Maya',
  'Chen', 'Emma', 'Diego', 'Yuki', 'Adaeze', 'Ravi', 'Hana', 'Marcus',
  'Sofia', 'Wei', 'Olu', 'Isla', 'Ahmed', 'Mei', 'Tomás', 'Naomi',
  'Bjorn', 'Imani', 'Kenji', 'Layla', 'Rohan', 'Astrid',
];
const LAST_NAMES = [
  'Johnson', 'Chen', 'Patel', 'Garcia', 'Smith', 'Kim', 'Murphy', 'Nguyen',
  'OBrien', 'Lopez', 'Singh', 'Adler', 'Tanaka', 'Adebayo', 'Williams',
  'Rossi', 'Khan', 'Andersson', 'Silva', 'Martins', 'Cohen', 'Park',
  'Dubois', 'Bauer', 'Hassan', 'Ivanov', 'Mendez', 'Ferrari', 'Lindqvist', 'Yamada',
];

const PROJECT_NAMES = [
  'Riverside Tower Phase 1', 'Industrial Park Block 4', 'Downtown Plaza Renovation',
  'Maple Heights Residential', 'Harbour Bridge Retrofit', 'North Station Expansion',
  'Greenfield Solar Farm', 'Central Hospital Wing C', 'Lakeview Office Park',
  'Pinecrest School Build', 'Westgate Highway Overpass', 'Sunset Marina Pier',
  'Eastside Warehouse Block A', 'Hillview Apartments', 'Old Mill District Reno',
  'Coastal Wind Turbine Site', 'Crescent Tower Foundation', 'Metro Tunnel Segment 7',
  'Civic Center Atrium', 'Riverside Tower Phase 2', 'South Loop Light Rail',
  'Greenway Pedestrian Bridge', 'Quarry Hill Extraction', 'Aurora Residential Complex',
  'Skyline Hotel Build-Out', 'Forest Edge Boardwalk', 'Heritage Theatre Restoration',
  'Block 12 Mixed-Use Tower', 'Trade Port Container Yard', 'Vista Heights Phase 3',
  'Northpoint Data Centre',
];

const LOCATIONS = [
  'Vancouver, BC', 'Toronto, ON', 'Calgary, AB', 'Montreal, QC',
  'Halifax, NS', 'Edmonton, AB', 'Winnipeg, MB', 'Ottawa, ON',
  'Victoria, BC', 'Quebec City, QC',
];

const EQUIPMENT_NAMES = [
  'CAT 320 Excavator', 'Komatsu PC200', 'JCB 3CX Backhoe',
  'Doosan DX300LC', 'Liebherr LTM 1100 Crane', 'Bobcat S650 Skid-Steer',
  'Volvo L90H Wheel Loader', 'Hitachi ZX350 Hydraulic Excavator',
  'CAT D6 Bulldozer', 'Manitou MRT 2150 Telehandler', 'Atlas Copco Air Compressor',
  'Wacker Neuson Plate Compactor', 'Genie GS-3232 Scissor Lift',
  'CAT 980 Wheel Loader', 'Komatsu HM400 Articulated Truck',
  'JLG 800S Boom Lift', 'Hilti TE 3000-AVR Demolition Hammer',
  'Stihl MS 661 Chainsaw', 'Honda EU7000iS Generator', 'Multiquip GA-6HRZ Pump',
  'CAT 745 Articulated Truck', 'Putzmeister Concrete Pump',
  'Liugong CLG856H Wheel Loader', 'Doosan DA40 Articulated Hauler',
  'Sany SCC500A Crawler Crane', 'Sumitomo SH200 Excavator',
  'Manitowoc 14000 Crane', 'Tadano GR-1000XL Rough Terrain Crane',
  'Develon DX225LC-7 Excavator', 'Kobelco SK350 Excavator',
];

const MATERIAL_TEMPLATES: { name: string; unit: string; minQty: number; maxQty: number }[] = [
  { name: 'Portland Cement', unit: 'tonnes', minQty: 20, maxQty: 200 },
  { name: 'Rebar #5', unit: 'tonnes', minQty: 5, maxQty: 50 },
  { name: 'Crushed Aggregate', unit: 'm³', minQty: 100, maxQty: 800 },
  { name: 'Structural Steel I-Beam', unit: 'tonnes', minQty: 10, maxQty: 80 },
  { name: 'Plywood Sheets 4x8', unit: 'sheets', minQty: 100, maxQty: 1000 },
  { name: 'Insulation Batts R-19', unit: 'm²', minQty: 200, maxQty: 1500 },
  { name: 'Drywall 1/2"', unit: 'sheets', minQty: 200, maxQty: 1200 },
  { name: 'Glass Curtain Wall Panels', unit: 'panels', minQty: 20, maxQty: 200 },
  { name: 'Asphalt Mix', unit: 'tonnes', minQty: 50, maxQty: 400 },
  { name: 'Copper Wiring 12AWG', unit: 'm', minQty: 500, maxQty: 5000 },
];

const PROJECT_STATUSES: ProjectStatus[] = [
  ProjectStatus.PLANNING, ProjectStatus.ACTIVE, ProjectStatus.ACTIVE,
  ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED,
  ProjectStatus.CANCELLED,
]; // weighted toward ACTIVE

const MATERIAL_STATUSES: MaterialStatus[] = [
  MaterialStatus.ORDERED, MaterialStatus.IN_TRANSIT,
  MaterialStatus.ON_SITE, MaterialStatus.ON_SITE,
  MaterialStatus.USED, MaterialStatus.RETURNED,
];

// Deterministic-ish picker: cycles by index, no PRNG needed for reproducibility.
const pickAt = <T>(arr: T[], i: number): T => arr[i % arr.length];

// Sentinel row that proves THIS seed has already run. Checking for a specific
// known email is precise — unlike a count threshold, it never falsely flags a
// sparsely-populated prod DB as "already seeded."
const SEED_SENTINEL_EMAIL = 'manager1@sitetrack.com';

// ── Main ──────────────────────────────────────────────────────────────────
async function seed() {
  const logger = new Logger('Seed');

  // Hard env guard — refuse to run anywhere but development unless explicitly
  // overridden. Prevents accidental seeding (with known-credential users) when
  // a CI job, a misconfigured shell, or a deploy script points at the wrong DB.
  if (
    process.env.NODE_ENV !== 'development' &&
    process.env.ALLOW_SEED !== 'true'
  ) {
    console.error(
      `Refusing to seed: NODE_ENV="${process.env.NODE_ENV ?? 'unset'}". ` +
        `Set ALLOW_SEED=true to override (e.g. for test fixtures).`,
    );
    process.exit(1);
  }

  // createApplicationContext spins up DI without HTTP/GraphQL listeners —
  // perfect for one-shot scripts that only need services and repositories.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  try {
    const ds = app.get(DataSource);
    const usersRepo = ds.getRepository(User);
    const projectsRepo = ds.getRepository(Project);
    const equipmentRepo = ds.getRepository(Equipment);
    const materialsRepo = ds.getRepository(Material);

    const sentinel = await usersRepo.findOne({
      where: { email: SEED_SENTINEL_EMAIL },
    });
    if (sentinel) {
      logger.log(
        `Seed sentinel ${SEED_SENTINEL_EMAIL} already exists — skipping. ` +
          `Truncate the tables for a fresh seed (see README).`,
      );
      return;
    }

    logger.log('Seeding users …');
    // 5 managers + 24 viewers — together with the admin that gives 30 users (1.5 pages)
    const managers: User[] = [];
    const viewers: User[] = [];
    for (let i = 0; i < 5; i++) {
      const first = pickAt(FIRST_NAMES, i);
      const last = pickAt(LAST_NAMES, i + 7);
      const user = usersRepo.create({
        email: `manager${i + 1}@sitetrack.com`,
        name: `${first} ${last}`,
        passwordHash: 'password123', // @BeforeInsert hook hashes this
        role: UserRole.MANAGER,
      });
      managers.push(await usersRepo.save(user));
    }
    for (let i = 0; i < 24; i++) {
      const first = pickAt(FIRST_NAMES, i + 5);
      const last = pickAt(LAST_NAMES, i + 11);
      const user = usersRepo.create({
        email: `viewer${i + 1}@sitetrack.com`,
        name: `${first} ${last}`,
        passwordHash: 'password123',
        role: UserRole.VIEWER,
      });
      viewers.push(await usersRepo.save(user));
    }
    logger.log(`  → ${managers.length} managers, ${viewers.length} viewers`);

    logger.log('Seeding projects …');
    const projects: Project[] = [];
    for (let i = 0; i < PROJECT_NAMES.length; i++) {
      const manager = pickAt(managers, i);
      const status = pickAt(PROJECT_STATUSES, i);
      // Dates spread across the past year — gives a realistic createdAt order
      const daysAgo = Math.floor(i * 11);
      const created = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const endDate =
        status === ProjectStatus.COMPLETED
          ? new Date(created.getTime() + 90 * 24 * 60 * 60 * 1000)
          : undefined;
      const project = projectsRepo.create({
        name: PROJECT_NAMES[i],
        description: `Phase work led by ${manager.name}. Auto-seeded for demo.`,
        status,
        location: pickAt(LOCATIONS, i),
        managerId: manager.id,
        startDate: created,
        endDate,
      });
      // Stamp createdAt manually so the list is ordered nicely for pagination demos
      project.createdAt = created;
      project.updatedAt = created;
      projects.push(await projectsRepo.save(project));
    }
    logger.log(`  → ${projects.length} projects`);

    logger.log('Seeding equipment …');
    let equipmentCount = 0;
    for (let i = 0; i < EQUIPMENT_NAMES.length; i++) {
      const manager = pickAt(managers, i + 2);
      const eq = equipmentRepo.create({
        name: EQUIPMENT_NAMES[i],
        description: `Asset assigned to ${manager.name}'s yard.`,
        managerId: manager.id,
      });
      await equipmentRepo.save(eq);
      equipmentCount++;
    }
    logger.log(`  → ${equipmentCount} equipment items`);

    logger.log('Seeding materials …');
    let materialCount = 0;
    for (let pi = 0; pi < projects.length; pi++) {
      // 3–5 materials per project — gives ~120 total, enough to exercise DataLoader batching
      const perProject = 3 + (pi % 3);
      for (let mi = 0; mi < perProject; mi++) {
        const template = pickAt(MATERIAL_TEMPLATES, pi + mi);
        const qty = template.minQty + Math.floor((pi * 7 + mi * 13) % (template.maxQty - template.minQty));
        const material = materialsRepo.create({
          name: template.name,
          quantity: qty,
          unit: template.unit,
          status: pickAt(MATERIAL_STATUSES, pi + mi),
          projectId: projects[pi].id,
        });
        await materialsRepo.save(material);
        materialCount++;
      }
    }
    logger.log(`  → ${materialCount} materials`);

    // Credentials are documented in the README — don't echo passwords in logs
    // (CI captures, terminal scrollback, screen-share leakage all apply).
    logger.log('Seed complete. See README "Seeding development data" for logins.');
  } finally {
    await app.close();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
