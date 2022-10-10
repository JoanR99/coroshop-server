import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ReviewInput {
  @Field()
  rating: number;

  @Field()
  comment: string;
}
