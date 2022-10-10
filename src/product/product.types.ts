import { Field, InputType, ObjectType, Int, Float } from '@nestjs/graphql';
import { GetPaginatedResponse } from 'src/shared/shared.types';
import { Product } from './product.model';

@InputType()
export class AddProductInput {
  @Field()
  name: string;

  @Field((_type) => Float)
  price: number;

  @Field()
  image: string;

  @Field()
  brand: string;

  @Field()
  category: string;

  @Field((_type) => Int)
  countInStock: number;

  @Field()
  description: string;
}

@ObjectType()
export class GetProductsResponse extends GetPaginatedResponse {
  @Field((_type) => [Product])
  products: Product[];
}
