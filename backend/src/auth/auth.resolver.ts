import { Resolver, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginInput, AuthPayload } from "./dto/auth.dto";
import { GqlThrottlerGuard } from "./guards/gql-throttler.guard";

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  // 5 attempts per 15 minutes per IP. Tight enough to make brute-force /
  // credential-stuffing impractical, generous enough that legitimate users
  // who fat-finger their password a few times aren't locked out.
  @Mutation(() => AuthPayload, { description: "Login with email + password" })
  @UseGuards(GqlThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  login(@Args("input") input: LoginInput): Promise<AuthPayload> {
    return this.authService.login(input);
  }

  /*
    disabling allowing external users from registering an account
  */
  // @Mutation(() => AuthPayload, { description: 'Register a new account' })
  // register(@Args('input') input: CreateUserInput): Promise<AuthPayload> {
  //   return this.authService.register(input);
  // }
}
