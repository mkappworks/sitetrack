import { ObjectType, Field, ID } from '@nestjs/graphql';

// A single active login session = one refresh-token family (one device).
// Exposes only safe metadata — never the token hash. `id` is the familyId,
// the stable handle the client uses to revoke the session.
@ObjectType()
export class Session {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  userAgent: string | null;

  @Field(() => String, { nullable: true })
  ipAddress: string | null;

  @Field()
  createdAt: Date;

  @Field()
  expiresAt: Date;

  // True for the session the requesting access token belongs to. Always
  // false in the admin view (admin isn't "on" the user's device).
  @Field()
  current: boolean;
}
