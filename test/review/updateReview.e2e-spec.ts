import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest-graphql';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { Product } from '../../src/product/product.model';
import { loginMutation } from '../user/authMutations';
import {
  VALID_CREDENTIALS,
  UNAUTHORIZED_MESSAGE,
  ADD_REVIEW_INPUT,
} from '../utils/constants';
import { Connection } from 'mongoose';
import { User } from '../../src/user/user.model';
import { hash } from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { updateReviewMutation } from './reviewMutations';
import { Review } from '../../src/review/review.model';

describe('Update Product (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let productModel: ReturnModelType<typeof Product>;
  let userModel: ReturnModelType<typeof User>;
  let reviewModel: ReturnModelType<typeof Review>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    productModel = moduleFixture.get<ReturnModelType<typeof Product>>(
      getModelToken(Product.name),
    );
    userModel = moduleFixture.get<ReturnModelType<typeof User>>(
      getModelToken(User.name),
    );
    reviewModel = moduleFixture.get<ReturnModelType<typeof Review>>(
      getModelToken(Review.name),
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

  type UpdateReviewInput = {
    comment?: string;
    rating?: number;
  };

  type UpdateReviewResponse = {
    updateReview: {
      message: string;
    };
  };

  type addReviewInput = {
    author: string;
    authorName: string;
    product: string;
    rating: number;
    comment: string;
  };

  const createReview = (reviewBody: addReviewInput) =>
    reviewModel.create(reviewBody);

  const updateReview = (
    updateBody: UpdateReviewInput | undefined = undefined,
    reviewId?: string,
    options: { accessToken?: string } = {},
  ) => {
    const agent = request(app.getHttpServer())
      .path('/api/graphql')
      .query(updateReviewMutation)
      .variables({ updateBody, reviewId });

    if ('accessToken' in options) {
      agent.set('Authorization', `Bearer ${options.accessToken}`);
    }

    return agent;
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

  describe('Fail cases', () => {
    it('should return error messages on request without updateBody', async () => {
      const response = await updateReview(undefined, 'valid-id');

      expect(response.errors.map((error) => error.message)[0]).toBe(
        'Variable "$updateBody" of required type "ReviewInput!" was not provided.',
      );
    });

    it('should return error messages on request without reviewId', async () => {
      const response = await updateReview(ADD_REVIEW_INPUT);

      expect(response.errors.map((error) => error.message)[0]).toBe(
        'Variable "$reviewId" of required type "String!" was not provided.',
      );
    });

    it('should return error messages on request without updateBody and reviewId', async () => {
      const response = await updateReview();

      expect(response.errors.map((error) => error.message)[0]).toBe(
        'Variable "$reviewId" of required type "String!" was not provided.',
      );

      expect(response.errors.map((error) => error.message)[1]).toBe(
        'Variable "$updateBody" of required type "ReviewInput!" was not provided.',
      );
    });

    it('should return error message on request without user logged', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      const product = await createProduct(user.id, user.name);

      const response = await updateReview(ADD_REVIEW_INPUT, product.id);

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(UNAUTHORIZED_MESSAGE),
      ).toBeTruthy();
    });
  });

  describe('Success cases', () => {
    it('should return success message on success request', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
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

      const response = await updateReview(ADD_REVIEW_INPUT, review.id, {
        accessToken,
      });

      expect((response.data as UpdateReviewResponse).updateReview.message).toBe(
        'Review updated',
      );
    });

    it('should update product in database on success request', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const product = await createProduct(user.id, user.name);

      const review = await createReview({
        author: user.id,
        authorName: user.name,
        product: product.id,
        rating: 4,
        comment: 'good',
      });

      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      await updateReview(ADD_REVIEW_INPUT, review.id, {
        accessToken,
      });

      const updatedReview = await reviewModel.findById(review.id);

      expect(review.comment).not.toBe(updatedReview.comment);
      expect(review.rating).not.toBe(updatedReview.rating);
    });
  });
});
