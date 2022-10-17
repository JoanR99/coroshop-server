import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { BaseService } from '../shared/base.service';
import { ReviewInput } from './review.dto';
import { Review } from './review.model';

@Injectable()
export class ReviewService extends BaseService<Review> {
  constructor(
    @InjectModel(Review.modelName)
    private readonly reviewModel: ReturnModelType<typeof Review>,
  ) {
    super(reviewModel);
  }

  findByProductId(productId: string) {
    return this.reviewModel.find({ product: productId });
  }

  async ratingOfProduct(productId: string) {
    const currentReviewsOfProduct = await this.reviewModel.find({
      product: productId,
    });

    const newRatingOfProduct =
      currentReviewsOfProduct.length > 0
        ? currentReviewsOfProduct.reduce(
            (acc: number, review) => review?.rating + acc,
            0,
          ) / currentReviewsOfProduct.length
        : 0;

    return newRatingOfProduct;
  }
}
