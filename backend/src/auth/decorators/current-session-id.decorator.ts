import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

// Usage: @CurrentSessionId() sid: string | null
// Returns the refresh-token familyId baked into the access token's `sid`
// claim (see JwtStrategy.validate). Null for tokens minted before sessions
// existed. Used to flag the caller's "current device" in mySessions.
export const CurrentSessionId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const context = GqlExecutionContext.create(ctx);
    return context.getContext().req.user?.sid ?? null;
  },
);
