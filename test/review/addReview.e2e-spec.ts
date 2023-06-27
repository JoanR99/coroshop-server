import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest-graphql';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { Product } from '../../src/product/product.model';
import { addReviewMutation } from './reviewMutations';
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
import { Review } from '../../src/review/review.model';

describe('Add Review (e2e)', () => {
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

  type AddReviewInput = {
    comment: string;
    rating: number;
  };

  type AddReviewResponse = {
    addReview: {
      message: string;
    };
  };

  const addReview = (
    productId: string,
    addReviewInput: AddReviewInput = ADD_REVIEW_INPUT,
    options: { accessToken?: string } = {},
  ) => {
    const agent = request(app.getHttpServer())
      .path('/api/graphql')
      .query(addReviewMutation)
      .variables({ reviewBody: addReviewInput, productId });

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
    it('should return error message on request without user logged', async () => {
      const user = await register({ ...VALID_CREDENTIALS, name: 'user' });
      const product = await createProduct(user.id, user.name);
      const response = await addReview(product.id);

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(UNAUTHORIZED_MESSAGE),
      ).toBeTruthy();
    });

    it('should return error message on request without productId', async () => {
      await register({ ...VALID_CREDENTIALS, name: 'user' });
      const loginResponse = await login(VALID_CREDENTIALS);

      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      const response = await addReview(undefined, ADD_REVIEW_INPUT, {
        accessToken,
      });

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(
            'Variable "$productId" of required type "String!" was not provided.',
          ),
      ).toBeTruthy();
    });

    it.each`
      field
      ${'comment'}
      ${'rating'}
    `(
      'should return error message when there is no $field input field',
      async ({ field }) => {
        const user = await register({ ...VALID_CREDENTIALS, name: 'user' });
        const loginResponse = await login(VALID_CREDENTIALS);

        const accessToken = (loginResponse.data as LoginResponse).login
          .accessToken;
        const product = await createProduct(user.id, user.name);
        const reviewInput = { ...ADD_REVIEW_INPUT, [field]: undefined };
        const response = await addReview(product.id, reviewInput, {
          accessToken,
        });

        expect(
          response.errors
            ?.map((error) => error.message)[0]
            .includes(`Field \"${field}\" of required type`),
        ).toBeTruthy();
      },
    );
  });

  describe('Success cases', () => {
    it('should return product data on success request', async () => {
      const user = await register({ ...VALID_CREDENTIALS, name: 'user' });
      const loginResponse = await login(VALID_CREDENTIALS);

      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      const product = await createProduct(user.id, user.name);
      const response = await addReview(product.id, ADD_REVIEW_INPUT, {
        accessToken,
      });

      expect((response.data as AddReviewResponse).addReview.message).toBe(
        'Review added',
      );
    });

    it('should save product in database on success request', async () => {
      const user = await register({ ...VALID_CREDENTIALS, name: 'user' });
      const loginResponse = await login(VALID_CREDENTIALS);

      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      const product = await createProduct(user.id, user.name);
      await addReview(product.id, ADD_REVIEW_INPUT, {
        accessToken,
      });

      const review = await reviewModel.findOne({ product: product.id });

      expect(review).toBeTruthy();

      expect(review?.comment).toBe(ADD_REVIEW_INPUT.comment);
      expect(review?.rating).toBe(ADD_REVIEW_INPUT.rating);
      expect(review?.authorName).toBe(user.name);
    });
  });
});
