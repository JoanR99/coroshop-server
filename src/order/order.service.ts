import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { BaseService } from '../shared/base.service';
import { Order } from './order.model';

@Injectable()
export class OrderService extends BaseService<Order> {
  constructor(
    @InjectModel(Order.modelName)
    private readonly orderModel: ReturnModelType<typeof Order>,
  ) {
    super(orderModel);
  }

  findByUserId(userId: string) {
    return this.orderModel.find({ orderBy: userId });
  }
}
