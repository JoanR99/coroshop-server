import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest-graphql';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import corsOptions from '../../src/corsOptions';
import {
  VALID_CREDENTIALS,
  BAD_REQUEST,
  USER_NOT_FOUND,
} from '../utils/constants';
import { Connection } from 'mongoose';
import { hash } from 'bcrypt';

import { User } from '../../src/user/user.model';
import { AppModule } from '../../src/app.module';
import { loginMutation } from './authMutations';

describe('Login (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let userModel: ReturnModelType<typeof User>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
  };

  type RegisterInput = AddUserInput & {
    isAdmin?: boolean;
  };

  const register = async (
    addUserInput: RegisterInput = {
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

  describe('Failing cases', () => {
    it('should return error messages on login request without credentials', async () => {
      const response = await login();

      const errorMessages = response.errors.map((error) => error.message);

      expect(
        errorMessages[0].includes(
          'Field "email" of required type "String!" was not provided.',
        ),
      ).toBeTruthy();
      expect(
        errorMessages[1].includes(
          'Field "password" of required type "String!" was not provided.',
        ),
      ).toBeTruthy();
    });

    it.each`
      field         | message                                                            | failCase
      ${'password'} | ${'Field "password" of required type "String!" was not provided.'} | ${'without password field'}
      ${'email'}    | ${'Field "email" of required type "String!" was not provided.'}    | ${'without email field'}
    `(
      'should return error message on login request $failCase',
      async ({ field, message }) => {
        const credentials = { ...VALID_CREDENTIALS, [field]: undefined };

        const response = await login(credentials);

        expect(
          response.errors.map((error) => error.message)[0].includes(message),
        ).toBeTruthy();
      },
    );

    it('should return error message on login request with malformed email', async () => {
      const response = await login({ ...VALID_CREDENTIALS, email: 'user@' });

      expect(
        response.errors.map((error) => error.message)[0].includes(BAD_REQUEST),
      ).toBeTruthy();
    });

    it('should return error message on login request with unregistered email', async () => {
      const response = await login({
        email: 'user@testing.com',
        password: 'P4ssw0rd',
      });

      expect(
        response.errors
          .map((error) => error.message)[0]
          .includes(USER_NOT_FOUND),
      ).toBeTruthy();
    });

    it('should return error message on login request with wrong password', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      const response = await login({
        email: 'user@testing.com',
        password: 'password',
      });

      expect(
        response.errors
          .map((error) => error.message)[0]
          .includes('Wrong credentials'),
      ).toBeTruthy();
    });
  });

  describe('Success cases', () => {
    it('should return accessToken when login success', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      const response = await login(VALID_CREDENTIALS);

      expect(
        (response.data as LoginResponse).login.accessToken,
      ).not.toBeUndefined();
    });

    it('should update refreshTokenVersion in database', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      await login(VALID_CREDENTIALS);

      const user = await userModel.findOne({
        email: VALID_CREDENTIALS.email,
      });

      expect(user?.refreshTokenVersion).toBe(1);
    });

    it('should return refreshToken cookie when login success', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      const response = await login(VALID_CREDENTIALS);

      expect(response.response.headers['set-cookie']).not.toBeUndefined();
    });
  });
});
