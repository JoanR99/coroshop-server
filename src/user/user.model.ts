import { Prop } from '@typegoose/typegoose';
import { Field as GqlField, ObjectType as GqlType } from '@nestjs/graphql';
import { BaseModel } from '../shared/base.model';

@GqlType()
export class User extends BaseModel {
  @GqlField((_type) => String)
  @Prop({ required: true })
  public name!: string;

  @GqlField((_type) => String)
  @Prop({ required: true, unique: true })
  public email!: string;

  @Prop({ required: true })
  public password!: string;

  @Prop({ default: 0, required: false })
  public refreshTokenVersion?: number;

  @GqlField((_type) => Boolean)
  @Prop({ default: false, required: false })
  public isAdmin?: boolean;
}
