import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductService } from './product.service';
import { Product } from './product.model';
import { UserModule } from '../user/user.module';
import { ProductResolver } from './product.resolver';
import { ReviewModule } from 'src/review/review.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.modelName, schema: Product.schema },
    ]),
    UserModule,
    ReviewModule,
  ],
  providers: [ProductResolver, ProductService],
  exports: [ProductService],
})
export class ProductModule {}
