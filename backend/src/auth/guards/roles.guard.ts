import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserRole } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Read the @Roles() decorator metadata set on the resolver method
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator = no restriction beyond authentication
    if (!requiredRoles || requiredRoles.length === 0) return true;

    // Get the authenticated user from the GraphQL context
    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user;

    if (!user) return false;

    // ADMIN always passes — they can do everything
    if (user.role === UserRole.ADMIN) return true;

    return requiredRoles.includes(user.role);
  }
}
