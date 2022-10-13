import { Prop, Ref } from '@typegoose/typegoose';
import {
  Field as GqlField,
  Float,
  ID,
  ObjectType as GqlType,
} from '@nestjs/graphql';

import { Product } from '../product/product.model';
import { User } from '../user/user.model';
import { BaseModel } from '../shared/base.model';

@GqlType()
export class Review extends BaseModel {
  @GqlField((_type) => Float)
  @Prop({ required: true })
  public rating!: number;

  @GqlField((_type) => String)
  @Prop({ required: true })
  public comment!: string;

  @GqlField((_type) => ID)
  @Prop({ required: true, ref: () => User })
  public author!: Ref<User>;

  @GqlField((_type) => String)
  @Prop({ required: true })
  public authorName!: string;

  @GqlField((_type) => ID)
  @Prop({ required: true, ref: () => Product })
  public product!: Ref<Product>;
}
