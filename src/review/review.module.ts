import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Review } from './review.model';
import { ReviewService } from './review.service';
import { UserModule } from '../user/user.module';
import { ProductModule } from '../product/product.module';
import { ReviewResolver } from './review.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.modelName, schema: Review.schema },
    ]),
    UserModule,
    ProductModule,
  ],
  providers: [ReviewService, ReviewResolver],
})
export class ReviewModule {}
