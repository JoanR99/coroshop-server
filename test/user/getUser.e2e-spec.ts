import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest-graphql';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import corsOptions from '../../src/corsOptions';
import {
  VALID_CREDENTIALS,
  BAD_ID,
  USER_NOT_FOUND,
  UNAUTHORIZED_MESSAGE,
} from '../utils/constants';
import { Connection } from 'mongoose';

import { User } from '../../src/user/user.model';
import { hash } from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { getUserQuery } from './userQueries';
import { loginMutation } from './authMutations';

describe('Get Product (e2e)', () => {
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

  const deleteUser = async (userId: string) =>
    userModel.findByIdAndDelete(userId);

  type GetUserResponse = {
    getUser: Omit<User, 'password' | 'refreshTokenVersion'>;
  };

  const getUser = (userId: string, options: { accessToken?: string } = {}) => {
    const agent = request(app.getHttpServer())
      .path('/api/graphql')
      .query(getUserQuery)
      .variables({ userId });

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

  describe('Fail cases', () => {
    it('should  return error message when userId argument is not a valid id', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      const response = await getUser('ididididididididididid', { accessToken });

      expect(
        response.errors?.map((error) => error.message)[0].includes(BAD_ID),
      ).toBeTruthy();
    });

    it('should  return error message on request without accessToken (login user)', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      const response = await getUser(user.id);

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(UNAUTHORIZED_MESSAGE),
      ).toBeTruthy();
    });

    it('should  return error message when logged user is not and admin', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      await deleteUser(user.id);

      const response = await getUser(user.id, { accessToken });

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(UNAUTHORIZED_MESSAGE),
      ).toBeTruthy();
    });

    it('should  return error message when user not found', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      await deleteUser(user.id);

      const response = await getUser(user.id, { accessToken });

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(USER_NOT_FOUND),
      ).toBeTruthy();
    });
  });

  describe('Success cases', () => {
    it('should return product data on response body', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await getUser(user.id, { accessToken });

      expect(Object.keys((response.data as GetUserResponse).getUser)).toEqual([
        'id',
        'name',
        'email',
        'isAdmin',
      ]);
    });

    it('should return correct product data', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await getUser(user.id, { accessToken });

      expect((response.data as GetUserResponse).getUser.id).toBe(user.id);
    });
  });
});
