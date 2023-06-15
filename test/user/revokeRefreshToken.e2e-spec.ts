import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest-graphql';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { VALID_CREDENTIALS, UNAUTHORIZED_MESSAGE } from '../utils/constants';
import { Connection } from 'mongoose';
import { hash } from 'bcrypt';

import { User } from '../../src/user/user.model';
import { AppModule } from '../../src/app.module';
import { revokeRefreshTokenMutation } from './userMutations';
import { loginMutation } from './authMutations';

describe('Revoke refresh token (e2e)', () => {
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

  const revokeRefreshToken = (
    userId: string | undefined = undefined,
    options: { accessToken?: string } = {},
  ) => {
    const agent = request(app.getHttpServer())
      .path('/api/graphql')
      .query(revokeRefreshTokenMutation)
      .variables({ userId });

    if ('accessToken' in options) {
      agent.set('Authorization', `Bearer ${options.accessToken}`);
    }

    return agent;
  };

  type RevokeRefreshTokenResponse = {
    revokeRefreshToken: { message: string };
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
    it('should return error messages on request without userId', async () => {
      const response = await revokeRefreshToken();

      expect(response.errors.map((error) => error.message)[0]).toBe(
        'Variable "$userId" of required type "String!" was not provided.',
      );
    });

    it('should return error message on request without user logged', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      const response = await revokeRefreshToken(user.id);

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(UNAUTHORIZED_MESSAGE),
      ).toBeTruthy();
    });

    it('should return error message on request with user not logged as an admin', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      const revokedUser = await register({
        name: 'user2',
        email: 'user2@example.com',
        password: 'hashed-password',
      });

      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await revokeRefreshToken(revokedUser.id, {
        accessToken,
      });

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(UNAUTHORIZED_MESSAGE),
      ).toBeTruthy();
    });

    it('should return error message on request with userId of user that does not exist', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });

      const revokedUser = await register({
        name: 'user2',
        email: 'user2@example.com',
        password: 'hashed-password',
      });

      await userModel.findByIdAndDelete(revokedUser.id);

      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await revokeRefreshToken(revokedUser.id, {
        accessToken,
      });

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes('User not found'),
      ).toBeTruthy();
    });
  });

  describe('Success cases', () => {
    it('should return success message on success request', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });

      const userToRevoke = await register({
        name: 'user2',
        email: 'user2@example.com',
        password: 'hashed-password',
      });

      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await revokeRefreshToken(userToRevoke.id, {
        accessToken,
      });

      expect(
        (response.data as RevokeRefreshTokenResponse).revokeRefreshToken
          .message,
      ).toBe('Token revoked');
    });

    it('should update user in database on success request', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });

      const userToRevoke = await register({
        name: 'user2',
        email: 'user2@example.com',
        password: 'hashed-password',
      });

      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      await revokeRefreshToken(userToRevoke.id, {
        accessToken,
      });

      const revokedUser = await userModel.findById(userToRevoke.id);

      expect(revokedUser.refreshTokenVersion).toBe(1);
    });
  });
});
