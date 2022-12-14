import { ApolloError } from 'apollo-server-express';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Order } from './order.model';
import { OrderService } from './order.service';
import { AuthGuard } from '../user/guards/auth.guard';
import { AdminGuard } from '../user/guards/admin.guard';
import { UserId } from '../user/decorators/userId.decorator';
import { UserService } from '../user/user.service';
import { AddOrderInput, UpdateOrderInput } from './order.dto';

@Resolver((of) => Order)
export class OrderResolver {
  constructor(
    private orderService: OrderService,
    private userService: UserService,
  ) {}

  @Query(() => [Order])
  @UseGuards(AuthGuard, AdminGuard)
  async getOrders(): Promise<Order[]> {
    const orders = await this.orderService.findAll();

    return orders;
  }

  @Query(() => [Order])
  @UseGuards(AuthGuard)
  async getUserOrders(@UserId() userId: string): Promise<Order[]> {
    const orders = await this.orderService.findByUserId(userId);

    return orders;
  }

  @Query(() => Order)
  @UseGuards(AuthGuard)
  async getOrderById(@Args('orderId') orderId: string): Promise<Order> {
    const order = await this.orderService.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  @Query(() => Number)
  @UseGuards(AuthGuard, AdminGuard)
  async getOrdersCount(): Promise<number> {
    const ordersCount = await this.orderService.count();

    return ordersCount;
  }

  @Mutation(() => Order)
  @UseGuards(AuthGuard)
  async addOrder(
    @Args('orderBody') orderBody: AddOrderInput,
    @UserId() userId: string,
  ): Promise<Order> {
    if (orderBody.orderItems && orderBody.orderItems.length === 0) {
      throw new ApolloError('No order items');
    } else {
      const userOrder = await this.userService.findById(userId);

      if (!userOrder) {
        throw new Error('User not found');
      }

      const order = await this.orderService.create({
        ...orderBody,
        orderBy: userOrder.id,
        orderByName: userOrder.name,
      });

      return order;
    }
  }

  @Mutation(() => Order)
  @UseGuards(AuthGuard)
  async updateOrderToPaid(
    @Args('orderId') orderId: string,
    @Args('paymentResultBody') paymentResultBody: UpdateOrderInput,
  ): Promise<Order> {
    const updatedOrder = await this.orderService.update(orderId, {
      paymentResult: paymentResultBody,
      isPaid: true,
      paidAt: new Date(Date.now()),
    });

    if (!updatedOrder) {
      throw new Error('Order not found');
    }

    return updatedOrder;
  }

  @Mutation(() => Order)
  @UseGuards(AuthGuard)
  async updateOrderToDelivered(
    @Args('orderId') orderId: string,
  ): Promise<Order> {
    const updatedOrder = await this.orderService.update(orderId, {
      isDelivered: true,
      deliveredAt: new Date(Date.now()),
    });

    if (!updatedOrder) {
      throw new Error('Order not found');
    }

    return updatedOrder;
  }
}
