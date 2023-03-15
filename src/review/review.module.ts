import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Review } from './review.model';
import { ReviewService } from './review.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.modelName, schema: Review.schema },
    ]),
  ],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
