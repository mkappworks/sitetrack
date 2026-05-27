import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../entities/user.entity';

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
  @IsEnum(UserRole)
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
