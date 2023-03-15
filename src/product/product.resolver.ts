import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from '../user/user.service';

import {
  ProductInput,
  GetProductsResponse,
  ProductInfo,
  ProductsByCategory,
} from './product.dto';
import { Product } from './product.model';
import { ProductService } from './product.service';
import { AuthGuard } from '../user/guards/auth.guard';
import { AdminGuard } from '../user/guards/admin.guard';
import { UserId } from '../user/decorators/userId.decorator';
import { MutationBasicResponse, GetProductsInput } from '../shared/shared.dto';
import createProductsFilterQuery from './createProductsFilterQuery';
import { ReviewService } from 'src/review/review.service';
import { Review } from 'src/review/review.model';

@Resolver((of) => ProductInfo)
export class ProductResolver {
  constructor(
    private productService: ProductService,
    private userService: UserService,
    private reviewService: ReviewService,
  ) {}

  @Query(() => GetProductsResponse)
  async getProducts(
    @Args('getProductsInput')
    { pageNumber, pageSize, ...filters }: GetProductsInput,
  ): Promise<GetProductsResponse> {
    const filterRegex = createProductsFilterQuery({ ...filters });

    const count = await this.productService.count(filterRegex);

    const pages = Math.ceil(count / pageSize);

    const page = pageNumber > pages ? 1 : pageNumber;

    const products = await this.productService
      .findAll(filterRegex)
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    return {
      products,
      page,
      pages,
    };
  }

  @Query(() => [ProductsByCategory])
  async getProductsGroupedByCategory(): Promise<ProductsByCategory[]> {
    const products = await this.productService.getGroupedByCategory();

    return products;
  }

  @Query(() => ProductInfo)
  async getProduct(@Args('productId') productId: string): Promise<ProductInfo> {
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

  @ResolveField('similarProducts', () => [Product])
  async getSimilarProducts(@Parent() product: ProductInfo) {
    const { category, id } = product;
    return await this.productService
      .findAll({ _id: { $ne: id }, category: category })
      .select('id name price image rating');
  }

  @ResolveField('reviews', () => [Review])
  async getReviews(@Parent() product: ProductInfo) {
    const { id } = product;
    return await this.reviewService
      .findAll({ product: id })
      .select('id rating comment author authorName createdAt');
  }
}
