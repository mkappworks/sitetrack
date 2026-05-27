import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LoginInput, AuthPayload } from './dto/auth.dto';
import { CreateUserInput } from '../users/dto/user.input';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload, { description: 'Login with email + password' })
  login(@Args('input') input: LoginInput): Promise<AuthPayload> {
    return this.authService.login(input);
  }

  @Mutation(() => AuthPayload, { description: 'Register a new account' })
  register(@Args('input') input: CreateUserInput): Promise<AuthPayload> {
    return this.authService.register(input);
  }
}
