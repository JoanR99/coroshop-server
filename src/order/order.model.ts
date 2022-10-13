import { Prop, Ref } from '@typegoose/typegoose';
import {
  Field as GqlField,
  Float,
  ID,
  Int,
  ObjectType as GqlType,
} from '@nestjs/graphql';

import { User } from '../user/user.model';
import { Product } from '../product/product.model';
import { BaseModel } from '../shared/base.model';

@GqlType()
export class OrderItem {
  @GqlField((_type) => String)
  @Prop({ required: true })
  public productName!: string;

  @GqlField((_type) => Int)
  @Prop({ required: true })
  public quantity!: number;

  @GqlField((_type) => String)
  @Prop({ required: true })
  public image!: string;

  @GqlField((_type) => Float)
  @Prop({ required: true })
  public price!: number;

  @GqlField((_type) => ID)
  @Prop({ required: true, ref: () => Product })
  public product!: Ref<Product>;
}

@GqlType()
class OrderItem2 extends OrderItem {}

@GqlType()
export class ShippingAddress {
  @GqlField((_type) => String)
  @Prop({ required: true })
  public address!: string;

  @GqlField((_type) => String)
  @Prop({ required: true })
  public city!: string;

  @GqlField((_type) => String)
  @Prop({ required: true })
  public postalCode!: string;

  @GqlField((_type) => String)
  @Prop({ required: true })
  public country!: string;
}

@GqlType()
class ShippingAddress2 extends ShippingAddress {}

@GqlType()
export class PaymentResult {
  @GqlField((_type) => String)
  @Prop()
  public id: string;

  @GqlField((_type) => String)
  @Prop()
  public status: string;

  @GqlField((_type) => String)
  @Prop()
  public update_time: string;

  @GqlField((_type) => String)
  @Prop()
  public email_address: string;
}

@GqlType()
class PaymentResult2 extends PaymentResult {}

@GqlType()
export class Order extends BaseModel {
  @GqlField((_type) => ID)
  @Prop({ required: true, ref: () => User })
  public orderBy!: Ref<User>;

  @GqlField((_type) => String)
  @Prop()
  public orderByName!: string;

  @GqlField((_type) => [OrderItem2])
  @Prop()
  public orderItems: OrderItem[];

  @GqlField((_type) => ShippingAddress2)
  @Prop()
  public shippingAddress!: ShippingAddress;

  @GqlField((_type) => String)
  @Prop({ required: true })
  public paymentMethod!: string;

  @GqlField((_type) => PaymentResult2)
  @Prop()
  public paymentResult?: PaymentResult;

  @GqlField((_type) => Float)
  @Prop({ required: true, default: 0.0 })
  public taxPrice!: number;

  @GqlField((_type) => Float)
  @Prop({ required: true, default: 0.0 })
  public shippingPrice!: number;

  @GqlField((_type) => Float)
  @Prop({ required: true, default: 0.0 })
  public totalPrice!: number;

  @GqlField((_type) => Boolean, { defaultValue: false })
  @Prop({ default: false, required: false })
  public isPaid: boolean;

  @GqlField((_type) => String, { nullable: true })
  @Prop()
  public paidAt?: Date;

  @GqlField((_type) => Boolean)
  @Prop({ default: false, required: false })
  public isDelivered: boolean;

  @GqlField((_type) => String, { nullable: true })
  @Prop()
  public deliveredAt?: Date;
}
