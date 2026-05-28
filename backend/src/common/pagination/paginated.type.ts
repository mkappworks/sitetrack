import { Type } from '@nestjs/common';
import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

// Factory that produces a concrete GraphQL ObjectType for a paginated list of T.
// `isAbstract: true` keeps THIS class out of the schema — only concrete
// subclasses like `ProjectPage extends Paginated(Project) {}` appear.
//
// Each subclass gets: items: [T!]!, total: Int!, limit: Int!, offset: Int!
export function Paginated<TItem>(TItemClass: Type<TItem>) {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType {
    @Field(() => [TItemClass])
    items: TItem[];

    // Exact COUNT(*) from the underlying table (post-filter, pre-LIMIT).
    // Allows the client to render "Page X of Y".
    @Field(() => Int)
    total: number;

    @Field(() => Int)
    limit: number;

    @Field(() => Int)
    offset: number;
  }
  return PaginatedType;
}

// Reusable args for any paginated query.
// limit/offset validation: Postgres treats negative OFFSET as an error, and
// unbounded `limit` is a DoS vector — cap at 100.
@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { defaultValue: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  offset: number = 0;
}
