import { MigrationInterface, QueryRunner } from 'typeorm';

// Trigram GIN indexes to accelerate the case-insensitive substring search
// used by the list views. Every search predicate is of the form
// `LOWER(col) LIKE LOWER(:term)` (which becomes `LOWER(col) LIKE '%term%'`),
// so the index expression MUST be `LOWER(col)` with gin_trgm_ops — an index
// on the raw column would not be used by a LOWER(col) predicate.
//
// Below ~10k rows the planner may still prefer a seq scan; these indexes
// matter at scale, where `LIKE '%term%'` would otherwise be a full scan.
export class AddSearchTrigramIndexes1780100000000 implements MigrationInterface {
  name = 'AddSearchTrigramIndexes1780100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // pg_trgm provides gin_trgm_ops, enabling GIN indexes for LIKE/ILIKE.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IX_projects_name_trgm" ON "projects" USING gin (LOWER("name") gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IX_equipments_name_trgm" ON "equipments" USING gin (LOWER("name") gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IX_users_name_trgm" ON "users" USING gin (LOWER("name") gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IX_users_email_trgm" ON "users" USING gin (LOWER("email") gin_trgm_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IX_users_email_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IX_users_name_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IX_equipments_name_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IX_projects_name_trgm"`);
    // Leave the pg_trgm extension installed — other objects may depend on it
    // and dropping an extension is rarely what a rollback wants.
  }
}
