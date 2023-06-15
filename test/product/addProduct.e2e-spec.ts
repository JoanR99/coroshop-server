import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest-graphql';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { Product } from '../../src/product/product.model';
import { addProductMutation } from './productMutations';
import { loginMutation } from '../user/authMutations';
import {
  ADD_PRODUCT_INPUT,
  VALID_CREDENTIALS,
  UNAUTHORIZED_MESSAGE,
} from '../utils/constants';
import { Connection } from 'mongoose';
import { User } from '../../src/user/user.model';
import { hash } from 'bcrypt';
import { AppModule } from '../../src/app.module';

describe('Add Product (e2e)', () => {
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
