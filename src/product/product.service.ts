import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { BaseService } from '../shared/base.service';
import { Product } from './product.model';

@Injectable()
export class ProductService extends BaseService<Product> {
  constructor(
    @InjectModel(Product.modelName)
    private readonly productModel: ReturnModelType<typeof Product>,
  ) {
    super(productModel);
  }

  getGroupedByCategory() {
    return this.productModel.aggregate([
      {
        $group: {
          _id: '$category',
          products: {
            $push: {
              id: '$_id',
              name: '$name',
              image: '$image',
              rating: '$rating',
              price: '$price',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          products: { $slice: ['$products', 4] },
        },
      },
    ]);
  }
}
