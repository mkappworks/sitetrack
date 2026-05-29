import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;   // user ID
  email: string;
  role: string;
  sid?: string;  // session id = refresh-token familyId, for session management
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      // Extract JWT from Authorization: Bearer <token> header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Called after the token signature is verified — the return value
  // is attached to req.user (and available via @CurrentUser() decorator)
  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user) throw new UnauthorizedException('User no longer exists');
    // Stash the session id (refresh-token familyId) on req.user so the
    // session-management resolvers can flag "this is your current device."
    // Non-persisted, ignored by GraphQL serialization.
    (user as User & { sid?: string }).sid = payload.sid;
    return user;
  }
}
