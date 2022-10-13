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
import { addProductMutation, updateProductMutation } from './productMutations';
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
import { getModelForClass } from '@typegoose/typegoose';
import { User } from '../../src/user/user.model';
import { hash } from 'bcrypt';

dotenv.config();

jest.setTimeout(20000);

describe('Update Product (e2e)', () => {
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

  type UpdateProductInput = {
    name?: string;
    price?: number;
    image?: string;
    brand?: string;
    category?: string;
    description?: string;
  };

  type UpdateProductResponse = {
    updateProduct: Product;
  };

  const updateProduct = (
    productBody: UpdateProductInput | undefined = undefined,
    productId?: string,
    options: { accessToken?: string } = {},
  ) => {
    const agent = request(app.getHttpServer())
      .path('/api/graphql')
      .query(updateProductMutation)
      .variables({ productBody, productId });

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

  const createProducts = async (
    productsNumber = 1,
    createdBy: string,
    createdByName: string,
  ) => {
    for (let i = 0; i < productsNumber; i++) {
      await productModel.create({
        name: `product${i}`,
        description: `description${i}`,
        price: i * 100,
        image: `/image${i}`,
        brand: `brand${i}`,
        category: `category${i}`,
        countInStock: i * 20,
        createdBy,
        createdByName,
      });
    }
  };

  describe('Fail cases', () => {
    it('should return error messages on request without productBody', async () => {
      const response = await updateProduct(undefined, 'valid-id');

      expect(response.errors.map((error) => error.message)[0]).toBe(
        'Variable "$productBody" of required type "ProductInput!" was not provided.',
      );
    });

    it('should return error messages on request without productId', async () => {
      const response = await updateProduct(ADD_PRODUCT_INPUT);

      expect(response.errors.map((error) => error.message)[0]).toBe(
        'Variable "$productId" of required type "String!" was not provided.',
      );
    });

    it('should return error messages on request without productBody and productId', async () => {
      const response = await updateProduct();

      expect(response.errors.map((error) => error.message)[0]).toBe(
        'Variable "$productBody" of required type "ProductInput!" was not provided.',
      );

      expect(response.errors.map((error) => error.message)[1]).toBe(
        'Variable "$productId" of required type "String!" was not provided.',
      );
    });

    it('should return error message on request without user logged', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(1, user.id, user.name);

      const [product] = await productModel.find();

      const response = await updateProduct(ADD_PRODUCT_INPUT, product.id);

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(UNAUTHORIZED_MESSAGE),
      ).toBeTruthy();
    });

    it('should return error message on request with user not logged as an admin', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(1, user.id, user.name);

      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const [product] = await productModel.find();

      const response = await updateProduct(ADD_PRODUCT_INPUT, product.id, {
        accessToken,
      });

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(UNAUTHORIZED_MESSAGE),
      ).toBeTruthy();
    });
  });

  describe('Success cases', () => {
    it('should return updated product data on success request', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      await createProducts(1, user.id, user.name);

      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const [product] = await productModel.find();

      const response = await updateProduct(ADD_PRODUCT_INPUT, product.id, {
        accessToken,
      });

      expect(
        Object.keys((response.data as UpdateProductResponse).updateProduct),
      ).toEqual(['id', 'name', 'image', 'rating', 'price']);
    });

    it('should update product in database on success request', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      await createProducts(1, user.id, user.name);

      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const [product] = await productModel.find();

      await updateProduct(ADD_PRODUCT_INPUT, product.id, {
        accessToken,
      });

      const updatedProduct = await productModel.findById(product.id);

      expect(product.name).not.toBe(updatedProduct.name);
      expect(product.image).not.toBe(updatedProduct.image);

      expect(product.price).not.toBe(updatedProduct.price);
    });
  });
});
