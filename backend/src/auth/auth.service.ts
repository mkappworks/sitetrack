import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../users/users.service";
import { LoginInput, AuthPayload } from "./dto/auth.dto";
import { User } from "../users/entities/user.entity";
import { JwtPayload } from "./strategies/jwt.strategy";
import { RefreshTokenService } from "./refresh-token.service";

interface RequestContext {
  userAgent?: string | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuthService {
  // Default 15m kept in sync with the JwtModule default. Parsed here only
  // so we can hand the client an absolute expiry timestamp.
  private readonly accessTokenTtlMs: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokens: RefreshTokenService,
    config: ConfigService,
  ) {
    this.accessTokenTtlMs = parseDurationMs(
      config.get<string>("JWT_EXPIRES_IN", "15m"),
    );
  }

  async login(input: LoginInput, ctx: RequestContext = {}): Promise<AuthPayload> {
    const user = await this.usersService.findByEmail(input.email);

    if (!user || !(await user.validatePassword(input.password))) {
      // Identical error for "no such email" and "wrong password" prevents
      // user enumeration via the login endpoint.
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens(user, ctx);
  }

  async refresh(rawRefreshToken: string, ctx: RequestContext = {}): Promise<AuthPayload> {
    const { userId, familyId, next } = await this.refreshTokens.rotate(rawRefreshToken, ctx);
    const user = await this.usersService.findOne(userId);
    if (!user) {
      // User deleted while session was active — refuse to mint new access.
      throw new UnauthorizedException("User no longer exists");
    }
    // familyId is preserved across rotation, so the new access token keeps
    // pointing at the same session.
    const accessToken = this.generateAccessToken(user, familyId);
    return {
      accessToken,
      refreshToken: next.rawToken,
      accessTokenExpiresAt: String(Date.now() + this.accessTokenTtlMs),
      user,
    };
  }

  async logout(rawRefreshToken: string): Promise<boolean> {
    // Always returns true — we don't leak whether the token existed.
    // The endpoint is idempotent from the client's perspective.
    await this.refreshTokens.revoke(rawRefreshToken);
    return true;
  }

  /*
    disabling allowing external users from registering an account
  */
  // async register(input: CreateUserInput): Promise<AuthPayload> {
  //   const user = await this.usersService.create(input);
  //   return this.issueTokens(user);
  // }

  private async issueTokens(user: User, ctx: RequestContext): Promise<AuthPayload> {
    // Issue the refresh token first so the access token can carry its
    // familyId as the `sid` claim (links access token → session/device).
    const { rawToken, familyId } = await this.refreshTokens.issueForLogin(user.id, ctx);
    const accessToken = this.generateAccessToken(user, familyId);
    return {
      accessToken,
      refreshToken: rawToken,
      accessTokenExpiresAt: String(Date.now() + this.accessTokenTtlMs),
      user,
    };
  }

  private generateAccessToken(user: User, sid?: string): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid,
    };
    return this.jwtService.sign(payload);
  }
}

// Minimal duration parser — handles the suffixes JwtModule's `expiresIn`
// accepts ('15m', '1h', '7d', or bare seconds-as-number). Centralized here
// so the absolute-expiry timestamp the client sees matches the JWT's own
// `exp` claim exactly.
function parseDurationMs(value: string): number {
  const match = /^(\d+)\s*([smhd]?)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid JWT_EXPIRES_IN value: ${value}`);
  }
  const n = parseInt(match[1], 10);
  const unit = match[2] || 's';
  const factor: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return n * factor[unit];
}
