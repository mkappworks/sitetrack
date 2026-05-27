import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { UsersSeedService } from './users-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, UsersResolver, UsersSeedService],
  // Export service so AuthModule can use it for JWT validation
  exports: [UsersService],
})
export class UsersModule {}
