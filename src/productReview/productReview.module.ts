import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { ProductModule } from '../product/product.module';
import { ProductReviewService } from './productReview.service';
import { ProductReviewResolver } from './productReview.resolver';
import { ReviewModule } from 'src/review/review.module';

@Module({
  imports: [ReviewModule, UserModule, ProductModule],
  providers: [ProductReviewService, ProductReviewResolver],
})
export class ProductReviewModule {}
