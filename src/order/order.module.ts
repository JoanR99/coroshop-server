import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order } from './order.model';
import { OrderService } from './order.service';
import { OrderResolver } from './order.resolver';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.modelName, schema: Order.schema },
    ]),
    UserModule,
  ],
  providers: [OrderService, OrderResolver],
})
export class OrderModule {}
