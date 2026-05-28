import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEquipmentIndexes1779967421650 implements MigrationInterface {
    name = 'AddEquipmentIndexes1779967421650'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "idx_equipments_manager_id" ON "equipments"  ("manager_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_equipments_manager_id"`);
    }

}
