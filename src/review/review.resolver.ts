import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from '../user/user.service';

import { AuthGuard } from '../user/guards/auth.guard';
import { UserId } from '../user/decorators/userId.decorator';
import { Review } from './review.model';
import { ReviewService } from './review.service';
import { ReviewInput } from './review.dto';
import { MutationBasicResponse } from '../shared/shared.dto';
import { ProductService } from '../product/product.service';

@Resolver((of) => Review)
export class ReviewResolver {
  constructor(
    private reviewService: ReviewService,
    private userService: UserService,
    private productService: ProductService,
  ) {}

  @Query(() => [Review])
  async getReviews(@Args('productId') productId: string): Promise<Review[]> {
    const reviews = await this.reviewService.findByProductId(productId);

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

    const reviewsOfProduct = await this.reviewService.findByProductId(
      product.id,
    );

    const alreadyReviewed = reviewsOfProduct.find(
      (review) => review?.author?.toString() === userId,
    );

    if (alreadyReviewed) {
      throw new Error('Product already reviewed');
    }

    const user = await this.userService.findById(userId);

    await this.reviewService.create({
      rating: reviewBody.rating,
      comment: reviewBody.comment,
      author: user?.id,
      authorName: user?.name,
      product: product.id,
    });

    const currentReviewsOfProduct = await this.reviewService.findByProductId(
      product.id,
    );

    await this.productService.findByIdAndUpdate(product.id, {
      numReviews: currentReviewsOfProduct.length,
    });

    if (currentReviewsOfProduct.length > 0) {
      const newRatingOfProduct =
        currentReviewsOfProduct.reduce(
          (acc: number, review) => review?.rating + acc,
          0,
        ) / currentReviewsOfProduct.length;

      await this.productService.findByIdAndUpdate(product.id, {
        rating: newRatingOfProduct,
      });
    } else {
      await this.productService.findByIdAndUpdate(product.id, {
        rating: 0,
      });
    }

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

    const updatedReview = await this.reviewService.findByIdAndUpdate(
      reviewId,
      updateBody,
    );

    if (updatedReview) {
      const product = await this.productService.findById(
        updatedReview.product.toString(),
      );

      if (!product) throw new Error('Product not found');

      const currentReviewsOfProduct = await this.reviewService.findByProductId(
        product.id,
      );

      const newRatingOfProduct =
        currentReviewsOfProduct.reduce(
          (acc: number, review) => review?.rating + acc,
          0,
        ) / currentReviewsOfProduct.length;

      await this.productService.findByIdAndUpdate(product.id, {
        rating: newRatingOfProduct,
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

    const currentReviewsOfProduct = await this.reviewService.findByProductId(
      product.id,
    );

    await this.productService.findByIdAndUpdate(product.id, {
      numReviews: currentReviewsOfProduct.length,
    });

    if (currentReviewsOfProduct.length > 0) {
      const newRatingOfProduct =
        currentReviewsOfProduct.reduce(
          (acc: number, review) => review?.rating + acc,
          0,
        ) / currentReviewsOfProduct.length;

      await this.productService.findByIdAndUpdate(product.id, {
        rating: newRatingOfProduct,
      });
    } else {
      await this.productService.findByIdAndUpdate(product.id, {
        rating: 0,
      });
    }

    return {
      message: 'Review deleted',
    };
  }
}
