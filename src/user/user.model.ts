import { Prop } from '@typegoose/typegoose';
import { Field as GqlField, ObjectType as GqlType } from '@nestjs/graphql';
import { BaseModel } from 'src/shared/base.model';

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

  @Prop({ default: 0 })
  public refreshTokenVersion: number;

  @GqlField((_type) => Boolean)
  @Prop({ required: true, default: false })
  public isAdmin!: boolean;
}
