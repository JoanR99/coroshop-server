import { Injectable } from '@nestjs/common';
import { ReviewService } from 'src/review/review.service';
import { ProductService } from 'src/product/product.service';
import { UserService } from 'src/user/user.service';
import { ReviewInput } from 'src/review/review.dto';
import { User } from 'src/user/user.model';
import { Product } from 'src/product/product.model';
import { Ref } from '@typegoose/typegoose';
import { Types } from 'mongoose';

@Injectable()
export class ProductReviewService {
  constructor(
    private reviewService: ReviewService,
    private productService: ProductService,
    private userService: UserService,
  ) {}

  findByProductId(productId: string) {
    return this.reviewService
      .findAll({ product: productId })
      .select('id comment rating author authorName createdAt');
  }

  async addProductReview(
    reviewBody: ReviewInput,
    userId: Ref<User, Types.ObjectId>,
    userName: string,
    productId: Ref<Product, Types.ObjectId>,
  ) {
    await this.reviewService.create({
      rating: reviewBody.rating,
      comment: reviewBody.comment,
      author: userId,
      authorName: userName,
      product: productId,
    });
  }

  async updateProductReviewInfo(productId: string) {
    const newRating = await this.ratingOfProduct(productId);
    const reviewsCount = await this.reviewService.count({
      product: productId,
    });

    await this.productService.update(productId, {
      rating: newRating,
      numReviews: reviewsCount,
    });
  }

  async ratingOfProduct(productId: string) {
    const currentReviewsOfProduct = await this.reviewService.findAll({
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
