import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { LoginInput, AuthPayload } from "./dto/auth.dto";
import { User } from "../users/entities/user.entity";
import { JwtPayload } from "./strategies/jwt.strategy";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(input: LoginInput): Promise<AuthPayload> {
    const user = await this.usersService.findByEmail(input.email);

    if (!user || !(await user.validatePassword(input.password))) {
      // Use the same error message for both cases to prevent user enumeration
      throw new UnauthorizedException("Invalid credentials");
    }

    return {
      accessToken: this.generateToken(user),
      user,
    };
  }

  /*
    disabling allowing external users from registering an account
  */
  // async register(input: CreateUserInput): Promise<AuthPayload> {
  //   const user = await this.usersService.create(input);
  //   return {
  //     accessToken: this.generateToken(user),
  //     user,
  //   };
  // }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
