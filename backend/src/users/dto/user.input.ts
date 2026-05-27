import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength, IsEnum, IsIn, IsOptional } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export const ASSIGNABLE_ROLES = [UserRole.MANAGER, UserRole.VIEWER] as const;

@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(2)
  name: string;

  @Field()
  @IsString()
  @MinLength(8)
  password: string;

  @Field(() => UserRole, { nullable: true })
  @IsIn(ASSIGNABLE_ROLES, { message: 'role must be MANAGER or VIEWER' })
  @IsOptional()
  role?: UserRole;
}

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @Field(() => UserRole, { nullable: true })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
