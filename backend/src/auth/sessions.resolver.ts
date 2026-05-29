import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { Session } from './dto/session.type';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentSessionId } from './decorators/current-session-id.decorator';
import { User, UserRole } from '../users/entities/user.entity';

function toSession(token: RefreshToken, currentSid: string | null): Session {
  return {
    id: token.familyId,
    userAgent: token.userAgent,
    ipAddress: token.ipAddress,
    createdAt: token.createdAt,
    expiresAt: token.expiresAt,
    current: token.familyId === currentSid,
  };
}

@Resolver(() => Session)
export class SessionsResolver {
  constructor(private readonly refreshTokens: RefreshTokenService) {}

  @Query(() => [Session], { description: 'Active login sessions for the current user' })
  @UseGuards(JwtAuthGuard)
  async mySessions(
    @CurrentUser() user: User,
    @CurrentSessionId() sid: string | null,
  ): Promise<Session[]> {
    const tokens = await this.refreshTokens.listActiveSessions(user.id);
    return tokens.map((t) => toSession(t, sid));
  }

  @Mutation(() => Boolean, { description: 'Revoke one of your own sessions (logs out that device)' })
  @UseGuards(JwtAuthGuard)
  revokeSession(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.refreshTokens.revokeSessionForUser(user.id, id);
  }

  @Query(() => [Session], { description: "A user's active sessions — Admin only" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async userSessions(
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<Session[]> {
    const tokens = await this.refreshTokens.listActiveSessions(userId);
    // `current` is always false in the admin view — the admin isn't on the
    // user's device.
    return tokens.map((t) => toSession(t, null));
  }

  @Mutation(() => Boolean, { description: "Revoke a specific user session — Admin only" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  revokeUserSession(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('sessionId', { type: () => ID }) sessionId: string,
  ): Promise<boolean> {
    return this.refreshTokens.revokeSessionForUser(userId, sessionId);
  }

  @Mutation(() => Boolean, { description: "Revoke ALL of a user's sessions (force logout) — Admin only" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async revokeAllUserSessions(
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<boolean> {
    await this.refreshTokens.revokeAllForUser(userId);
    return true;
  }
}
