import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntry } from './entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuditResolver } from './audit.resolver';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

// @Global so AuditService can be injected (often via @Optional) by services
// across domains without each module importing AuditModule.
//
// Deliberately does NOT import AuthModule: AuthService/RefreshTokenService
// depend on AuditService (global), so an AuditModule→AuthModule import edge
// would make provider init-order ambiguous and could silently inject
// undefined into the auth services. The resolver's guards are dependency-
// light (Reflector is core-global; the jwt passport strategy self-registers
// via AuthModule), so we provide them locally instead.
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntry])],
  providers: [AuditService, AuditResolver, JwtAuthGuard, RolesGuard],
  exports: [AuditService],
})
export class AuditModule {}
