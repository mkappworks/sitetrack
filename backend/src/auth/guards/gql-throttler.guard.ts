import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Standard ThrottlerGuard reads `req` via context.switchToHttp(), which
 * returns undefined for GraphQL requests. Override getRequestResponse to
 * extract them from GqlExecutionContext instead.
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const { req, res } = ctx.getContext<{ req: Request; res: Response }>();
    return { req, res };
  }
}
