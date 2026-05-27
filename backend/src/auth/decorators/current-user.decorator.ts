import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

// Usage: @CurrentUser() user: User
// Works in any GraphQL resolver method decorated with @UseGuards(JwtAuthGuard)
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const context = GqlExecutionContext.create(ctx);
    return context.getContext().req.user;
  },
);
