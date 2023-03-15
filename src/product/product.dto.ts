import { Field, InputType, ObjectType, Int, Float, ID } from '@nestjs/graphql';
import { Review } from 'src/review/review.model';
import { GetPaginatedResponse } from '../shared/shared.dto';
import { Product } from './product.model';

@InputType()
export class ProductInput {
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

@ObjectType()
export class ProductInfo extends Product {
  @Field((_type) => [Product], {
    nullable: true,
    name: 'similarProducts',
  })
  public similarProducts?: Product[];

  @Field((_type) => [Review], { nullable: true, name: 'reviews' })
  public reviews?: Review[];
}

@ObjectType()
export class ProductsByCategory {
  @Field((_type) => [Product], {
    nullable: true,
  })
  public products?: Product[];

  @Field((_type) => String, { nullable: true })
  public category?: string;
}
