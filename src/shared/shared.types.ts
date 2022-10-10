import { Min } from 'class-validator';
import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';

@InputType()
export class GetItemsInput {
  @Field()
  keyword: string;

  @Field((_type) => Int)
  @Min(1)
  pageSize: number;

  @Field((_type) => Int)
  @Min(1)
  pageNumber: number;
}

@ObjectType()
export class MutationBasicResponse {
  @Field()
  message: string;
}

@ObjectType()
export class GetPaginatedResponse {
  @Field()
  page: number;

  @Field()
  pages: number;
}
