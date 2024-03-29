import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { BaseService } from '../shared/base.service';
import { Review } from './review.model';

@Injectable()
export class ReviewService extends BaseService<Review> {
  constructor(
    @InjectModel(Review.modelName)
    private readonly reviewModel: ReturnModelType<typeof Review>,
  ) {
    super(reviewModel);
  }
}
