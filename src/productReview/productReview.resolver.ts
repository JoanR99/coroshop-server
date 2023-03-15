import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from '../user/user.service';

import { AuthGuard } from '../user/guards/auth.guard';
import { UserId } from '../user/decorators/userId.decorator';
import { Review } from '../review/review.model';
import { ReviewInput } from '../review/review.dto';
import { MutationBasicResponse } from '../shared/shared.dto';
import { ProductReviewService } from './productReview.service';
import { ProductService } from 'src/product/product.service';
import { ReviewService } from 'src/review/review.service';

@Resolver((of) => Review)
export class ProductReviewResolver {
  constructor(
    private productReviewService: ProductReviewService,
    private productService: ProductService,
    private userService: UserService,
    private reviewService: ReviewService,
  ) {}

  @Query(() => [Review])
  async getReviews(@Args('productId') productId: string): Promise<Review[]> {
    const reviews = await this.productReviewService.findByProductId(productId);

    return reviews;
  }

  @Mutation(() => MutationBasicResponse)
  @UseGuards(AuthGuard)
  async addReview(
    @Args('reviewBody') reviewBody: ReviewInput,
    @Args('productId') productId: string,
    @UserId() userId: string,
  ): Promise<MutationBasicResponse> {
    const product = await this.productService.findById(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    const reviewsOfProduct = await this.productReviewService.findByProductId(
      product.id,
    );

    const alreadyReviewed = reviewsOfProduct.find(
      (review) => review?.author?.toString() === userId,
    );

    if (alreadyReviewed) {
      throw new Error('Product already reviewed');
    }

    const user = await this.userService.findById(userId);

    await this.productReviewService.addProductReview(
      reviewBody,
      user.id,
      user.name,
      product.id,
    );

    await this.productReviewService.updateProductReviewInfo(productId);

    return {
      message: 'Review added',
    };
  }

  @Mutation(() => Review)
  @UseGuards(AuthGuard)
  async updateReview(
    @Args('reviewId') reviewId: string,
    @Args('updateBody') updateBody: ReviewInput,
    @UserId() userId: string,
  ): Promise<Review> {
    const review = await this.reviewService.findById(reviewId);

    if (!review) {
      throw new Error('Review not found');
    }

    if (review?.author?.toString() !== userId) {
      throw new Error('You are not authorized to perform this action');
    }

    const updatedReview = await this.reviewService.update(reviewId, updateBody);

    if (updatedReview) {
      const product = await this.productService.findById(
        updatedReview.product.toString(),
      );

      if (!product) throw new Error('Product not found');

      const newRating = await this.productReviewService.ratingOfProduct(
        product.id,
      );

      await this.productService.update(product.id, {
        rating: newRating,
      });
    }

    return updatedReview;
  }

  @Mutation(() => MutationBasicResponse)
  @UseGuards(AuthGuard)
  async deleteReview(
    @Args('reviewId') reviewId: string,
    @UserId() userId: string,
  ): Promise<MutationBasicResponse> {
    const review = await this.reviewService.findById(reviewId);

    if (!review) {
      throw new Error('Review not found');
    }

    if (review?.author?.toString() !== userId) {
      throw new Error('You are not authorized to perform this action');
    }

    await this.reviewService.deleteById(reviewId);

    const product = await this.productService.findById(
      review.product.toString(),
    );

    if (!product) throw new Error('Product not found');

    await this.productReviewService.updateProductReviewInfo(product.id);

    return {
      message: 'Review deleted',
    };
  }
}
