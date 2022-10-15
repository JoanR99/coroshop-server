import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest-graphql';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import corsOptions from '../../src/corsOptions';
import { Product } from '../../src/product/product.model';
import { deleteProductMutation } from './productMutations';
import { loginMutation } from '../utils/authMutations';
import {
  VALID_CREDENTIALS,
  UNAUTHORIZED_MESSAGE,
  UNDEFINED_STRING,
  BAD_ID,
  PRODUCT_NOT_FOUND,
} from '../utils/constants';
import { Connection } from 'mongoose';
import { User } from '../../src/user/user.model';
import { hash } from 'bcrypt';
import { AppModule } from '../../src/app.module';

describe('Delete Product (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let productModel: ReturnModelType<typeof Product>;
  let userModel: ReturnModelType<typeof User>;

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
    connection = moduleFixture.get<Connection>(getConnectionToken());
    app = moduleFixture.createNestApplication();
    app.enableCors(corsOptions as any);

    await app.init();
  });

  afterEach(async () => {
    const collections = connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    await app.close();
  });

  type DeleteProductResponse = {
    deleteProduct: {
      message: string;
    };
  };

  const deleteProduct = (
    productId?: string,
    options: { accessToken?: string } = {},
  ) => {
    const agent = request(app.getHttpServer())
      .path('/api/graphql')
      .query(deleteProductMutation)
      .variables({ productId });

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
    it('should return error message on request without productId', async () => {
      const response = await deleteProduct();

      expect(
        response.errors
          .map((error) => error.message)[0]
          .includes(UNDEFINED_STRING),
      ).toBeTruthy();
    });

    it('should return error message on request with invalid productId', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      const response = await deleteProduct('invalid-id', { accessToken });

      expect(
        response.errors.map((error) => error.message)[0].includes(BAD_ID),
      ).toBeTruthy();
    });

    it('should return error message on request by unauthorized user', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      const response = await deleteProduct('valid-id', { accessToken });

      expect(
        response.errors
          .map((error) => error.message)[0]
          .includes(UNAUTHORIZED_MESSAGE),
      ).toBeTruthy();
    });

    it('should return error message on request when product not found', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      await createProducts(2, user.id, user.name);
      const [product] = await productModel.find({});
      const deletedProduct = await productModel.findByIdAndDelete(product.id);
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      const response = await deleteProduct(deletedProduct.id, { accessToken });

      expect(
        response.errors
          .map((error) => error.message)[0]
          .includes(PRODUCT_NOT_FOUND),
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
      await createProducts(1, user.id, user.name);
      const [product] = await productModel.find({});
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      const response = await deleteProduct(product.id, { accessToken });

      expect(
        (response.data as DeleteProductResponse).deleteProduct.message,
      ).toBe('Product deleted');
    });

    it('should delete product on success request', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      await createProducts(1, user.id, user.name);
      const [product] = await productModel.find({});
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      await deleteProduct(product.id, { accessToken });

      const deletedProduct = await productModel.findById(product.id);

      expect(deletedProduct).toBeNull();
    });
  });
});
