import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest-graphql';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
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
import { getUserProfileQuery } from './userQueries';
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

  const deleteUser = async (userId: string) =>
    userModel.findByIdAndDelete(userId);

  type GetUserProfileResponse = {
    getUserProfile: Omit<User, 'password' | 'refreshTokenVersion'>;
  };

  const getUserProfile = (options: { accessToken?: string } = {}) => {
    const agent = request(app.getHttpServer())
      .path('/api/graphql')
      .query(getUserProfileQuery);

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
    it('should  return error message on request without accessToken (login user)', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      const response = await getUserProfile();

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

      const response = await getUserProfile({ accessToken });

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

      const response = await getUserProfile({ accessToken });

      expect(
        Object.keys((response.data as GetUserProfileResponse).getUserProfile),
      ).toEqual(['id', 'name', 'email', 'isAdmin']);
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

      const response = await getUserProfile({ accessToken });

      expect((response.data as GetUserProfileResponse).getUserProfile.id).toBe(
        user.id,
      );
    });
  });
});
