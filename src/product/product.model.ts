import { Prop, Ref } from '@typegoose/typegoose';
import {
  Field as GqlField,
  Float,
  ID,
  Int,
  ObjectType as GqlType,
} from '@nestjs/graphql';

import { User } from '../user/user.model';
import { BaseModel } from 'src/shared/base.model';

@GqlType()
export class Product extends BaseModel {
  @GqlField((_type) => ID)
  @Prop({ required: true, ref: () => User })
  public createdBy!: Ref<User>;

  @GqlField((_type) => String)
  @Prop({ required: true })
  public name!: string;

  @GqlField((_type) => String)
  @Prop({ required: true })
  public image!: string;

  @GqlField((_type) => String)
  @Prop({ required: true })
  public brand!: string;

  @GqlField((_type) => String)
  @Prop({ required: true })
  public category!: string;

  @GqlField((_type) => String)
  @Prop({ required: true })
  public description!: string;

  @GqlField((_type) => Float)
  @Prop({ default: 0 })
  public rating: number;

  @GqlField((_type) => Int)
  @Prop({ default: 0 })
  public numReviews: number;

  @GqlField((_type) => Float)
  @Prop({ required: true, default: 0 })
  public price!: number;

  @GqlField((_type) => Int)
  @Prop({ required: true, default: 0 })
  public countInStock!: number;
}
