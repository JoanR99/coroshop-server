import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest-graphql';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import corsOptions from '../../src/corsOptions';
import { VALID_CREDENTIALS } from '../utils/constants';

import { Connection } from 'mongoose';
import { User } from '../../src/user/user.model';
import { hash } from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { Review } from '../../src/review/review.model';
import { Product } from '../../src/product/product.model';
import { getReviewsQuery } from './reviewQueries';

describe('Get Products (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let reviewModel: ReturnModelType<typeof Review>;
  let productModel: ReturnModelType<typeof Product>;
  let userModel: ReturnModelType<typeof User>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    reviewModel = moduleFixture.get<ReturnModelType<typeof Review>>(
      getModelToken(Review.name),
    );
    productModel = moduleFixture.get<ReturnModelType<typeof Product>>(
      getModelToken(Product.name),
    );
    userModel = moduleFixture.get<ReturnModelType<typeof User>>(
      getModelToken(User.name),
    );
    connection = moduleFixture.get<Connection>(getConnectionToken());
    app = moduleFixture.createNestApplication();
    app.enableCors(corsOptions as any);
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    const collections = connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    await app.close();
  });

  type AddUserInput = {
    name?: string;
    email?: string;
    password?: string;
    isAdmin?: boolean;
  };

  const register = async (
    addUserInput: AddUserInput = {
      name: undefined,
      email: undefined,
      password: undefined,
      isAdmin: false,
    },
  ) => {
    addUserInput.password = await hash(addUserInput.password, 10);
    return userModel.create({ ...addUserInput });
  };

  const createProduct = (createdBy: string, createdByName: string) =>
    productModel.create({
      name: `product`,
      description: `description`,
      price: 100,
      image: `/image`,
      brand: `brand`,
      category: `category`,
      countInStock: 20,
      createdBy,
      createdByName,
    });

  type addReviewInput = {
    author: string;
    authorName: string;
    product: string;
    rating: number;
    comment: string;
  };

  const createReview = (reviewBody: addReviewInput) =>
    reviewModel.create(reviewBody);

  type GetReviewsResponse = {
    getReviews: Review[];
  };

  const getReviews = (productId: string = undefined) =>
    request(app.getHttpServer())
      .path('/api/graphql')
      .query(getReviewsQuery)
      .variables({ productId });

  describe('Fail cases', () => {
    it('should  return error message when productId is not provided', async () => {
      const response = await getReviews();

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(
            'Variable "$productId" of required type "String!" was not provided.',
          ),
      ).toBeTruthy();
    });
  });

  describe('Success cases', () => {
    it('should return reviews array on success request', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      const product = await createProduct(user.id, user.name);

      await createReview({
        author: user.id,
        authorName: user.name,
        product: product.id,
        rating: 5,
        comment: 'good',
      });

      const response = await getReviews(product.id);

      expect((response.data as GetReviewsResponse).getReviews.length).toBe(1);
    });

    it('should return empty reviews array on success request when product not found', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      const product = await createProduct(user.id, user.name);

      const response = await getReviews(product.id);

      expect((response.data as GetReviewsResponse).getReviews.length).toBe(0);
    });
  });
});
