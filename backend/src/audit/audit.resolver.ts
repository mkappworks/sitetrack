import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLogPage } from './dto/audit-log-page.type';
import { PaginationArgs } from '../common/pagination/paginated.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Resolver(() => AuditLogPage)
export class AuditResolver {
  constructor(private readonly auditService: AuditService) {}

  @Query(() => AuditLogPage, { description: 'Audit log (paginated, newest first) — Admin only' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  auditLog(@Args() args: PaginationArgs): Promise<AuditLogPage> {
    return this.auditService.findAll(args);
  }
}
