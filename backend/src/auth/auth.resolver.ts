import { Resolver, Mutation, Args, Context } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginInput, RefreshTokenInput, AuthPayload } from "./dto/auth.dto";
import { GqlThrottlerGuard } from "./guards/gql-throttler.guard";

// Pulls IP + UA off the underlying request so refresh-token rows record
// where each session was issued from. Best-effort: behind a reverse proxy
// without trust-proxy, ip will be the proxy's; that's a deployment-time fix.
function extractCtx(gqlContext: { req?: any }): {
  userAgent?: string | null;
  ipAddress?: string | null;
} {
  const req = gqlContext?.req;
  if (!req) return {};
  return {
    userAgent: req.headers?.["user-agent"] ?? null,
    ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
  };
}

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  // 5 attempts per 15 minutes per IP. Tight enough to make brute-force /
  // credential-stuffing impractical, generous enough that legitimate users
  // who fat-finger their password a few times aren't locked out.
  @Mutation(() => AuthPayload, { description: "Login with email + password" })
  @UseGuards(GqlThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  login(
    @Args("input") input: LoginInput,
    @Context() ctx: any,
  ): Promise<AuthPayload> {
    return this.authService.login(input, extractCtx(ctx));
  }

  // 30 refreshes / 5 min / IP. A legitimate active session refreshes every
  // ~14 minutes (access TTL 15m). 30/5m gives generous headroom for parallel
  // tabs without enabling a brute-force loop against the token surface.
  @Mutation(() => AuthPayload, {
    description: "Exchange a refresh token for a new access + refresh token pair",
  })
  @UseGuards(GqlThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 5 * 60 * 1000 } })
  refreshTokens(
    @Args("input") input: RefreshTokenInput,
    @Context() ctx: any,
  ): Promise<AuthPayload> {
    return this.authService.refresh(input.refreshToken, extractCtx(ctx));
  }

  // Logout is unauthenticated by design — a stolen access token shouldn't
  // be required to revoke a stolen refresh token; the refresh token IS the
  // bearer credential being revoked.
  @Mutation(() => Boolean, { description: "Revoke a refresh token (logout)" })
  logout(@Args("input") input: RefreshTokenInput): Promise<boolean> {
    return this.authService.logout(input.refreshToken);
  }

  /*
    disabling allowing external users from registering an account
  */
  // @Mutation(() => AuthPayload, { description: 'Register a new account' })
  // register(@Args('input') input: CreateUserInput): Promise<AuthPayload> {
  //   return this.authService.register(input);
  // }
}
