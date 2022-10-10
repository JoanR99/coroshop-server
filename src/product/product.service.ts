import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { BaseService } from '../shared/base.service';
import { Product } from './product.model';

type QueryProducts = { name: { $regex: string; $options: string } } | {};

@Injectable()
export class ProductService extends BaseService<Product> {
  constructor(
    @InjectModel(Product.modelName)
    private readonly productModel: ReturnModelType<typeof Product>,
  ) {
    super(productModel);
  }

  findAllByRegex(keyword: QueryProducts) {
    return this.productModel.find({ ...keyword });
  }

  countByRegex(keyword: QueryProducts) {
    return this.productModel.countDocuments({ ...keyword });
  }

  findByIdAndUpdate(productId: string, productBody: Partial<Product>) {
    return this.productModel.findByIdAndUpdate(
      productId,
      { ...productBody },
      { new: true },
    );
  }
}
