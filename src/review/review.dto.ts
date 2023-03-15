import { Field, InputType, ObjectType, ID, Float } from '@nestjs/graphql';

@InputType()
export class ReviewInput {
  @Field()
  rating: number;

  @Field()
  comment: string;
}
