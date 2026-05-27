import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from './entities/user.entity';

const ADMIN_EMAIL = 'admin@sitetrack.com';
const ADMIN_PASSWORD = 'password123';

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

  constructor(private readonly usersService: UsersService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV !== 'development') return;

    const existing = await this.usersService.findByEmail(ADMIN_EMAIL);
    if (existing) {
      this.logger.log(`Admin user '${ADMIN_EMAIL}' already exists — seed skipped`);
      return;
    }

    await this.usersService.create({
      email: ADMIN_EMAIL,
      name: 'Admin',
      password: ADMIN_PASSWORD,
      role: UserRole.ADMIN,
    });
    this.logger.log(`Seeded admin user '${ADMIN_EMAIL}' (password: '${ADMIN_PASSWORD}')`);
  }
}
