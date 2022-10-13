import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductService } from './product.service';
import { Product } from './product.model';
import { UserModule } from '../user/user.module';
import { ProductResolver } from './product.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.modelName, schema: Product.schema },
    ]),
    UserModule,
  ],
  providers: [ProductResolver, ProductService],
  exports: [ProductService],
})
export class ProductModule {}
