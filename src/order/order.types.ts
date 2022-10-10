import { Field, Int, Float, InputType, ID } from '@nestjs/graphql';
import { Product } from '../product/product.model';
import { Ref } from '@typegoose/typegoose';

@InputType()
export class OrderItem {
  @Field()
  productName!: string;

  @Field((_type) => Int)
  quantity!: number;

  @Field()
  image!: string;

  @Field((_type) => Float)
  price!: number;

  @Field((__type) => ID)
  product!: Ref<Product>;
}

@InputType()
export class ShippingAddress {
  @Field()
  address!: string;

  @Field()
  city!: string;

  @Field()
  postalCode!: string;

  @Field()
  country!: string;
}

@InputType()
export class AddOrderInput {
  @Field((type) => [OrderItem])
  orderItems: OrderItem[];

  @Field((type) => ShippingAddress)
  shippingAddress: ShippingAddress;

  @Field()
  paymentMethod: string;

  @Field((type) => Float)
  itemsPrice: number;

  @Field((type) => Float)
  taxPrice: number;

  @Field((type) => Float)
  shippingPrice: number;

  @Field((type) => Float)
  totalPrice: number;
}

@InputType()
export class UpdateOrderInput {
  @Field()
  id: string;

  @Field()
  status: string;

  @Field()
  update_time: string;

  @Field()
  email_address: string;
}
