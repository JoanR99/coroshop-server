import { ObjectId, Schema } from 'mongoose';
import {
  buildSchema,
  ModelOptions,
  prop,
  Severity,
} from '@typegoose/typegoose';
import { Field as GqlField, ID, ObjectType as GqlType } from '@nestjs/graphql';

@GqlType()
@ModelOptions({ options: { allowMixed: Severity.ALLOW } })
export abstract class BaseModel {
  @GqlField((_type) => Date)
  @prop()
  createdAt?: Date;

  @prop()
  updatedAt?: Date;

  @GqlField((_type) => ID)
  id?: ObjectId;

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
