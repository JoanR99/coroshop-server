import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import request from 'supertest-graphql';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { ProductModule } from '../../src/product/product.module';
import * as cookieParser from 'cookie-parser';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import corsOptions from '../../src/corsOptions';
import { Product } from '../../src/product/product.model';
import { addProductMutation } from './productMutations';
import { loginMutation } from '../utils/authMutations';
import {
  ADD_PRODUCT_INPUT,
  VALID_CREDENTIALS,
  UNAUTHORIZED_MESSAGE,
} from '../utils/constants';
import { UserModule } from '../../src/user/user.module';
import { ProductResolver } from '../../src/product/product.resolver';
import { ProductService } from '../../src/product/product.service';
import { Connection } from 'mongoose';
import * as dotenv from 'dotenv';
import { User } from '../../src/user/user.model';
import { hash } from 'bcrypt';

dotenv.config();

jest.setTimeout(20000);

describe('Add Product (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let productModel: ReturnModelType<typeof Product>;
  let userModel: ReturnModelType<typeof User>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ProductModule,
        UserModule,
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          playground: false,
          autoSchemaFile: true,
          context: ({ req, res }) => ({ req, res }),
          path: '/api/graphql',
          cors: false,
        }),
        MongooseModule.forRoot(process.env.MONGO_URI_TEST, {
          connectionFactory: (conn) => {
            connection = conn;
            return conn;
          },
        }),
        MongooseModule.forFeature([
          { name: Product.modelName, schema: Product.schema },
        ]),
      ],
      providers: [ProductResolver, ProductService],
    }).compile();

    productModel = moduleFixture.get<ReturnModelType<typeof Product>>(
      getModelToken(Product.name),
    );
    userModel = moduleFixture.get<ReturnModelType<typeof User>>(
      getModelToken(User.name),
    );
    app = moduleFixture.createNestApplication();
    app.enableCors(corsOptions as any);
    app.use(cookieParser());
    await app.init();
  });

  afterEach(async () => {
    const collections = connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  afterAll(async () => {
    await app.close();
  });

  type AddProductInput = {
    name: string;
    price: number;
    image: string;
    brand: string;
    category: string;
    countInStock: number;
    description: string;
  };

  type AddProductResponse = {
    addProduct: Product;
  };

  const addProduct = (
    addProductInput: AddProductInput = ADD_PRODUCT_INPUT,
    options: { accessToken?: string } = {},
  ) => {
    const agent = request(app.getHttpServer())
      .path('/api/graphql')
      .query(addProductMutation)
      .variables({ addProductInput });

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

  describe('Fail cases', () => {
    it('should return error message on request without user logged', async () => {
      const response = await addProduct();

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(UNAUTHORIZED_MESSAGE),
      ).toBeTruthy();
    });

    it('should return error message on request with user not logged as an admin', async () => {
      await register({ ...VALID_CREDENTIALS, name: 'user' });

      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await addProduct(ADD_PRODUCT_INPUT, { accessToken });

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(UNAUTHORIZED_MESSAGE),
      ).toBeTruthy();
    });

    it.each`
      field
      ${'name'}
      ${'price'}
      ${'image'}
      ${'brand'}
      ${'category'}
      ${'countInStock'}
      ${'description'}
    `(
      'should return error message when there is no $field input field',
      async ({ field }) => {
        await register({ ...VALID_CREDENTIALS, name: 'user' });

        const loginResponse = await login(VALID_CREDENTIALS);
        const accessToken = (loginResponse.data as LoginResponse).login
          .accessToken;
        const productInput = { ...ADD_PRODUCT_INPUT, [field]: undefined };
        const response = await addProduct(productInput, { accessToken });

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
      await register({ ...VALID_CREDENTIALS, name: 'user', isAdmin: true });

      const loginResponse = await login(VALID_CREDENTIALS);

      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await addProduct(ADD_PRODUCT_INPUT, { accessToken });

      expect(
        Object.keys((response.data as AddProductResponse).addProduct),
      ).toEqual(['id', 'name', 'image', 'rating', 'price']);
    });

    it('should save product in database on success request', async () => {
      await register({ ...VALID_CREDENTIALS, name: 'user', isAdmin: true });

      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await addProduct(ADD_PRODUCT_INPUT, { accessToken });

      const product = await productModel.findById(
        (response.data as AddProductResponse).addProduct.id,
      );

      expect(product).toBeTruthy();

      expect(product?.name).toBe(ADD_PRODUCT_INPUT.name);

      expect(product?.price).toBe(ADD_PRODUCT_INPUT.price);

      expect(product?.image).toBe(ADD_PRODUCT_INPUT.image);
    });
  });
});
