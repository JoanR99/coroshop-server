import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from '../user/user.service';

import { ProductInput, GetProductsResponse } from './product.dto';
import { Product } from './product.model';
import { ProductService } from './product.service';
import { AuthGuard } from '../user/guards/auth.guard';
import { AdminGuard } from '../user/guards/admin.guard';
import { UserId } from '../user/decorators/userId.decorator';
import { MutationBasicResponse, GetItemsInput } from '../shared/shared.dto';

@Resolver((of) => Product)
export class ProductResolver {
  constructor(
    private productService: ProductService,
    private userService: UserService,
  ) {}

  @Query(() => GetProductsResponse)
  async getProducts(
    @Args('getProductsInput')
    { pageNumber, pageSize, keyword }: GetItemsInput,
  ): Promise<GetProductsResponse> {
    const keywordRegex = keyword
      ? {
          name: {
            $regex: keyword,
            $options: 'i',
          },
        }
      : {};

    const count = await this.productService.count(keywordRegex);

    const pages = Math.ceil(count / pageSize);

    const page = pageNumber > pages ? 1 : pageNumber;

    const products = await this.productService
      .findAll(keywordRegex)
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    return {
      products,
      page,
      pages,
    };
  }

  @Query(() => Product)
  async getProduct(@Args('productId') productId: string): Promise<Product> {
    const product = await this.productService.findById(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  @Query(() => Number)
  @UseGuards(AuthGuard, AdminGuard)
  async getProductsCount(): Promise<number> {
    const productsCount = await this.productService.count();

    return productsCount;
  }

  @Mutation(() => Product)
  @UseGuards(AuthGuard, AdminGuard)
  async addProduct(
    @Args('addProductInput') product: ProductInput,
    @UserId() userId: string,
  ): Promise<Product> {
    const user = await this.userService.findById(userId);

    const createdProduct = await this.productService.create({
      ...product,
      createdBy: user?.id,
      rating: 0,
      numReviews: 0,
    });

    return createdProduct;
  }

  @Mutation(() => MutationBasicResponse)
  @UseGuards(AuthGuard, AdminGuard)
  async deleteProduct(
    @Args('productId') productId: string,
  ): Promise<MutationBasicResponse> {
    const product = await this.productService.deleteById(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    return {
      message: 'Product deleted',
    };
  }

  @Mutation(() => Product)
  @UseGuards(AuthGuard, AdminGuard)
  async updateProduct(
    @Args('productBody') productBody: ProductInput,
    @Args('productId') productId: string,
  ): Promise<Product> {
    const product = await this.productService.update(productId, productBody);

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }
}
