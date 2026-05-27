import { DataSource } from 'typeorm';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// This datasource is used ONLY by the TypeORM CLI for migration generation/run.
// The app uses the TypeOrmModule.forRootAsync() in app.module.ts.
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_NAME ?? 'sitetrack',
  username: process.env.DB_USER ?? 'sitetrack',
  password: process.env.DB_PASSWORD ?? 'sitetrack_dev',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
