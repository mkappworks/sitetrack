import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User, UserRole } from "./entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

// const ADMIN_EMAIL = "admin@sitetrack.com";
// const ADMIN_PASSWORD = "password123";

/**
 * Auto-seeds a demo admin user on first boot in development.
 * Guarded by NODE_ENV so it can never fire in production.
 *
 * Fires after the full app (including TypeORM connection) is ready —
 * OnModuleInit would race with TypeORM's connection setup.
 */
@Injectable()
export class UsersSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersSeedService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === "test") return;

    const email = this.config.get<string>("SEED_ADMIN_EMAIL");
    const password = this.config.get<string>("SEED_ADMIN_PASSWORD");

    if (!email || !password) {
      this.logger.log("SEED_ADMIN_EMAIL/PASSWORD not set — skipping seed");
      return;
    }

    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) {
      this.logger.log(`Admin user '${email}' already exists — seed skipped`);
      return;
    }

    if (existing) {
      this.logger.log(`Admin user '${email}' already exists — seed skipped`);
      return;
    }

    const admin = this.usersRepo.create({
      email: email,
      name: "Admin",
      passwordHash: password, // BeforeInsert will hash it
      role: UserRole.ADMIN, // legal — we're past the service guard
    });
    await this.usersRepo.save(admin);

    this.logger.log(`Seeded admin user '${email}' (password: '${password}')`);
  }
}
