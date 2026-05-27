import { InputType, Field, ID } from "@nestjs/graphql";
import { IsString, MinLength, IsOptional, IsUUID } from "class-validator";

@InputType()
export class UpdateEquipmentInput {
  @Field({ nullable: true })
  @IsString()
  @MinLength(3)
  @IsOptional()
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  managerId?: string;
}
