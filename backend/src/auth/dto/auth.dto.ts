import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { User } from '../../users/entities/user.entity';

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(8)
  password: string;
}

@InputType()
export class RefreshTokenInput {
  @Field()
  @IsString()
  refreshToken: string;
}

// Shape returned by login / refreshTokens. Refresh-token expiry isn't
// exposed — the client treats it opaquely; only the server needs to know
// when it actually expires. Access-token expiry IS exposed so the client
// can refresh proactively a few seconds before expiry.
@ObjectType()
export class AuthPayload {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;

  // Milliseconds since epoch — string because JS Number's safe-integer
  // ceiling and the GraphQL Int spec (32-bit signed) both bite well before
  // year 2038. String avoids both.
  @Field()
  accessTokenExpiresAt: string;

  @Field(() => User)
  user: User;
}
