import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest-graphql';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { Product } from '../../src/product/product.model';
import { getProductsQuery } from './productQueries';
import {
  VALID_CREDENTIALS,
  BAD_INT_INPUT,
  BAD_STRING_INPUT,
  BAD_REQUEST,
  BAD_FLOAT_INPUT,
} from '../utils/constants';

import { Connection } from 'mongoose';
import { User } from '../../src/user/user.model';
import { hash } from 'bcrypt';
import { AppModule } from '../../src/app.module';

describe('Get Products (e2e)', () => {
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

  type GetProductsInput = {
    pageSize?: any;
    pageNumber?: any;
    keyword?: any;
    minPriceLimit?: any;
    maxPriceLimit?: any;
    minRating?: any;
    category?: any;
  };

  type GetProductsResponse = {
    getProducts: {
      products: Product[];
      pages: number;
      page: number;
    };
  };

  const getProducts = (
    getProductsInput: GetProductsInput = {
      pageNumber: 1,
      pageSize: 10,
      keyword: '',
    },
  ) =>
    request(app.getHttpServer())
      .path('/api/graphql')
      .query(getProductsQuery)
      .variables({ getProductsInput });

  describe('Fail cases', () => {
    it('should  return error message when pageSize argument is not a number', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(1, user.id, user.name);
      const response = await getProducts({
        pageNumber: 1,
        pageSize: '',
        keyword: '',
      });

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(BAD_INT_INPUT),
      ).toBeTruthy();
    });

    it('should  return error message when pageNumber argument is not a number', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(1, user.id, user.name);

      const response = await getProducts({
        pageNumber: '',
        pageSize: 1,
        keyword: '',
      });

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(BAD_INT_INPUT),
      ).toBeTruthy();
    });

    it('should  return error messages when both pageSize and pageNumber arguments are not numbers', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(1, user.id, user.name);

      const response = await getProducts({
        pageNumber: '',
        pageSize: '',
        keyword: '',
      });

      response.errors?.forEach((error) =>
        expect(error.message.includes(BAD_INT_INPUT)).toBeTruthy(),
      );
    });

    it('should  return error message when keyword argument is not a string', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(1, user.id, user.name);

      const response = await getProducts({
        pageNumber: 1,
        pageSize: 1,
        keyword: 1,
      });

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(BAD_STRING_INPUT),
      ).toBeTruthy();
    });

    it('should return error message when pageNumber argument is below 1', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(1, user.id, user.name);

      const response = await getProducts({
        pageNumber: -5,
        pageSize: 1,
        keyword: '',
      });

      expect(response.errors.map((error) => error.message)[0]).toBe(
        BAD_REQUEST,
      );
    });

    it('should return error message when pageSize argument is below 1', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(13, user.id, user.name);

      const response = await getProducts({
        pageNumber: 2,
        pageSize: 0,
        keyword: '',
      });

      expect(response.errors.map((error) => error.message)[0]).toBe(
        BAD_REQUEST,
      );
    });

    it('should  return error message when minPriceLimit argument is not a number', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(1, user.id, user.name);

      const response = await getProducts({
        pageNumber: 1,
        pageSize: 1,
        keyword: '',
        minPriceLimit: '',
      });

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(BAD_FLOAT_INPUT),
      ).toBeTruthy();
    });

    it('should  return error message when maxPriceLimit argument is not a number', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(1, user.id, user.name);

      const response = await getProducts({
        pageNumber: 1,
        pageSize: 1,
        keyword: '',
        maxPriceLimit: '',
      });

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(BAD_FLOAT_INPUT),
      ).toBeTruthy();
    });

    it('should  return error message when minRating argument is not a number', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(1, user.id, user.name);

      const response = await getProducts({
        pageNumber: 1,
        pageSize: 1,
        keyword: '',
        minRating: '',
      });

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(BAD_FLOAT_INPUT),
      ).toBeTruthy();
    });
  });

  describe('Bad inputs returning default properties cases', () => {
    it('should return first page when pageNumber parameter is greater than current possible pages', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(1, user.id, user.name);

      const response = await getProducts({
        pageNumber: 2,
        pageSize: 1,
        keyword: '',
      });

      expect(
        (response.data as GetProductsResponse).getProducts.products.length,
      ).toBe(1);
      expect((response.data as GetProductsResponse).getProducts.page).toBe(1);
      expect((response.data as GetProductsResponse).getProducts.pages).toBe(1);
    });
  });

  describe('Success cases', () => {
    it('should return page object as response body', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(1, user.id, user.name);

      const response = await getProducts({
        pageNumber: 1,
        pageSize: 1,
        keyword: '',
      });

      expect(
        (response.data as GetProductsResponse).getProducts.products.length,
      ).toBe(1);
      expect((response.data as GetProductsResponse).getProducts.page).toBe(1);
      expect((response.data as GetProductsResponse).getProducts.pages).toBe(1);
    });

    it('should return correct products and pagination data', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(11, user.id, user.name);

      const response = await getProducts({
        pageNumber: 1,
        pageSize: 10,
        keyword: '',
      });

      expect(
        (response.data as GetProductsResponse).getProducts.products.length,
      ).toBe(10);
      expect((response.data as GetProductsResponse).getProducts.page).toBe(1);
      expect((response.data as GetProductsResponse).getProducts.pages).toBe(2);
    });

    it('should return correct products and pagination data when keyword is provided', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(11, user.id, user.name);

      const response = await getProducts({
        pageNumber: 1,
        pageSize: 10,
        keyword: 'product8',
      });

      expect(
        (response.data as GetProductsResponse).getProducts.products.length,
      ).toBe(1);

      expect(
        (response.data as GetProductsResponse).getProducts.products[0].name,
      ).toBe('product8');
      expect((response.data as GetProductsResponse).getProducts.page).toBe(1);
      expect((response.data as GetProductsResponse).getProducts.pages).toBe(1);
    });

    it('should return correct products and pagination data when maxPriceLimit is provided', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(11, user.id, user.name);

      const response = await getProducts({
        pageNumber: 1,
        pageSize: 10,
        keyword: '',
        maxPriceLimit: 50,
      });

      expect(
        (response.data as GetProductsResponse).getProducts.products.length,
      ).toBe(1);

      expect(
        (response.data as GetProductsResponse).getProducts.products[0].name,
      ).toBe('product0');
      expect((response.data as GetProductsResponse).getProducts.page).toBe(1);
      expect((response.data as GetProductsResponse).getProducts.pages).toBe(1);
    });

    it('should return correct products and pagination data when minPriceLimit is provided', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(11, user.id, user.name);

      const response = await getProducts({
        pageNumber: 1,
        pageSize: 10,
        keyword: '',
        minPriceLimit: 1000,
      });

      expect(
        (response.data as GetProductsResponse).getProducts.products.length,
      ).toBe(1);

      expect(
        (response.data as GetProductsResponse).getProducts.products[0].name,
      ).toBe('product10');
      expect((response.data as GetProductsResponse).getProducts.page).toBe(1);
      expect((response.data as GetProductsResponse).getProducts.pages).toBe(1);
    });

    it('should return correct products and pagination data when minRating is provided', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(11, user.id, user.name);

      await productModel.findOneAndUpdate({ name: 'product0' }, { rating: 4 });

      const response = await getProducts({
        pageNumber: 1,
        pageSize: 10,
        keyword: '',
        minRating: 3,
      });

      expect(
        (response.data as GetProductsResponse).getProducts.products.length,
      ).toBe(1);

      expect(
        (response.data as GetProductsResponse).getProducts.products[0].name,
      ).toBe('product0');
      expect((response.data as GetProductsResponse).getProducts.page).toBe(1);
      expect((response.data as GetProductsResponse).getProducts.pages).toBe(1);
    });

    it('should return correct products and pagination data when category is provided', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      await createProducts(11, user.id, user.name);

      const response = await getProducts({
        pageNumber: 1,
        pageSize: 10,
        keyword: '',
        category: 'category0',
      });

      expect(
        (response.data as GetProductsResponse).getProducts.products.length,
      ).toBe(1);

      expect(
        (response.data as GetProductsResponse).getProducts.products[0].name,
      ).toBe('product0');
      expect((response.data as GetProductsResponse).getProducts.page).toBe(1);
      expect((response.data as GetProductsResponse).getProducts.pages).toBe(1);
    });
  });
});
