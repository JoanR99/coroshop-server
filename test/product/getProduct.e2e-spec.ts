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
import { getProductQuery } from './productQueries';
import {
  VALID_CREDENTIALS,
  BAD_ID,
  PRODUCT_NOT_FOUND,
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

describe('Get Product (e2e)', () => {
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

  type GetProductResponse = {
    getProduct: Product;
  };

  const getProduct = (productId: string) =>
    request(app.getHttpServer())
      .path('/api/graphql')
      .query(getProductQuery)
      .variables({ productId });

  describe('Fail cases', () => {
    it('should  return error message when productId argument is not a valid id', async () => {
      const response = await getProduct('ididididididididididid');

      expect(
        response.errors?.map((error) => error.message)[0].includes(BAD_ID),
      ).toBeTruthy();
    });

    it('should  return error message when product not found', async () => {
      const user = await register({ ...VALID_CREDENTIALS, name: 'user' });
      await createProducts(2, user.id, user.name);

      const [product] = await productModel.find();

      const deletedProduct = await productModel.findByIdAndDelete(product.id);

      const response = await getProduct(deletedProduct!.id);

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(PRODUCT_NOT_FOUND),
      ).toBeTruthy();
    });
  });

  describe('Success cases', () => {
    it('should return product data on response body', async () => {
      const user = await register({ ...VALID_CREDENTIALS, name: 'user' });
      await createProducts(1, user.id, user.name);
      const [product] = await productModel.find();

      const response = await getProduct(product.id);

      expect(
        Object.keys((response.data as GetProductResponse).getProduct),
      ).toEqual([
        'id',
        'name',
        'image',
        'brand',
        'category',
        'description',
        'rating',
        'numReviews',
        'price',
        'countInStock',
      ]);
    });

    it('should return correct product data', async () => {
      const user = await register({ ...VALID_CREDENTIALS, name: 'user' });
      await createProducts(1, user.id, user.name);
      const [product] = await productModel.find();

      const response = await getProduct(product.id);

      expect((response.data as GetProductResponse).getProduct.id).toBe(
        product.id,
      );
    });
  });
});
