import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest-graphql';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import {
  BAD_ID,
  REVIEW_NOT_FOUND,
  UNDEFINED_STRING,
  VALID_CREDENTIALS,
} from '../utils/constants';

import { Connection } from 'mongoose';
import { User } from '../../src/user/user.model';
import { hash } from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { Review } from '../../src/review/review.model';
import { Product } from '../../src/product/product.model';
import { deleteReviewMutation } from './reviewMutations';
import { loginMutation } from '../user/authMutations';

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

  type LoginInput = {
    email?: string;
    password?: string;
  };

  type LoginResponse = {
    login: {
      accessToken: string;
    };
  };

  const login = (loginInput: LoginInput = {}) =>
    request(app.getHttpServer())
      .path('/api/graphql')
      .query(loginMutation)
      .variables({ loginInput });

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

  type DeleteReviewResponse = {
    deleteReview: {
      message: string;
    };
  };

  const deleteReview = (
    reviewId?: string,
    options: { accessToken?: string } = {},
  ) => {
    const agent = request(app.getHttpServer())
      .path('/api/graphql')
      .query(deleteReviewMutation)
      .variables({ reviewId });

    if ('accessToken' in options) {
      agent.set('Authorization', `Bearer ${options.accessToken}`);
    }

    return agent;
  };

  describe('Fail cases', () => {
    it('should return error message on request without reviewId', async () => {
      const response = await deleteReview();

      expect(
        response.errors
          .map((error) => error.message)[0]
          .includes(UNDEFINED_STRING),
      ).toBeTruthy();
    });

    it('should return error message on request with invalid reviewId', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      const response = await deleteReview('invalid-id', { accessToken });

      expect(
        response.errors.map((error) => error.message)[0].includes(BAD_ID),
      ).toBeTruthy();
    });

    it('should return error message on request by unauthorized user', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      const user2 = await register({
        ...VALID_CREDENTIALS,
        email: 'emailtest@test.com',
        name: 'user2',
      });

      const product = await createProduct(user2.id, user2.name);
      const review = await createReview({
        author: user2.id,
        authorName: user.name,
        product: product.id,
        rating: 5,
        comment: 'good',
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await deleteReview(review.id, { accessToken });

      expect(
        response.errors
          .map((error) => error.message)[0]
          .includes('You are not authorized to perform this action'),
      ).toBeTruthy();
    });

    it('should return error message on request when review not found', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await deleteReview(user.id, { accessToken });

      expect(
        response.errors
          .map((error) => error.message)[0]
          .includes(REVIEW_NOT_FOUND),
      ).toBeTruthy();
    });
  });

  describe('Success cases', () => {
    it('should return success message on success request', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      const product = await createProduct(user.id, user.name);
      const review = await createReview({
        author: user.id,
        authorName: user.name,
        product: product.id,
        rating: 5,
        comment: 'good',
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await deleteReview(review.id, { accessToken });
      expect((response.data as DeleteReviewResponse).deleteReview.message).toBe(
        'Review deleted',
      );
    });

    it('should delete product on success request', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      const product = await createProduct(user.id, user.name);
      const review = await createReview({
        author: user.id,
        authorName: user.name,
        product: product.id,
        rating: 5,
        comment: 'good',
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      await deleteReview(review.id, { accessToken });
      const deletedReview = await reviewModel.findById(review.id);
      expect(deletedReview).toBeNull();
    });
  });
});
