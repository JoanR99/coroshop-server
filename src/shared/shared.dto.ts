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

@InputType()
export class GetProductsInput extends GetItemsInput {
  @Field(() => Number, { nullable: true })
  minPriceLimit?: number;

  @Field(() => Number, { nullable: true })
  maxPriceLimit?: number;

  @Field(() => Number, { nullable: true })
  minRating?: number;

  @Field(() => String, { nullable: true })
  category?: string;
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
