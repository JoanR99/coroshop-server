import { Schema } from 'mongoose';
import { buildSchema, prop } from '@typegoose/typegoose';
import { Field as GqlField, ObjectType as GqlType } from '@nestjs/graphql';

@GqlType()
export abstract class BaseModel {
  @GqlField((_type) => Date)
  @prop()
  createdAt?: Date;

  @prop()
  updatedAt?: Date;

  @GqlField((_type) => String)
  id?: string;

  static get schema(): Schema {
    return buildSchema(this as any, {
      timestamps: true,
      toJSON: {
        getters: true,
        virtuals: true,
      },
    });
  }

  static get modelName(): string {
    return this.name;
  }
}
