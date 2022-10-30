import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest-graphql';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import corsOptions from '../../src/corsOptions';
import { VALID_CREDENTIALS, UNAUTHORIZED_MESSAGE } from '../utils/constants';
import { Connection } from 'mongoose';
import { hash } from 'bcrypt';

import { User } from '../../src/user/user.model';
import { AppModule } from '../../src/app.module';
import { updateUserProfileMutation } from './userMutations';
import { loginMutation } from './authMutations';

describe('Update user (e2e)', () => {
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

  const updateInput: RegisterInput = {
    name: 'newUser',
    email: 'new.user@example.com',
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

  const updateUser = (
    updateBody: Omit<RegisterInput, 'password'> = undefined,
    options: { accessToken?: string } = {},
  ) => {
    const agent = request(app.getHttpServer())
      .path('/api/graphql')
      .query(updateUserProfileMutation)
      .variables({ updateBody });

    if ('accessToken' in options) {
      agent.set('Authorization', `Bearer ${options.accessToken}`);
    }

    return agent;
  };

  type UpdateUserProfileResponse = {
    updateUserProfile: Omit<User, 'password' | 'refreshTokenVersion'>;
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
    it('should return error messages on request without updateUserInput', async () => {
      const response = await updateUser(undefined);

      expect(response.errors.map((error) => error.message)[0]).toBe(
        'Variable "$updateBody" of required type "UpdateUserProfileInput!" was not provided.',
      );
    });

    it('should return error message on request without user logged', async () => {
      const response = await updateUser(updateInput);

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(UNAUTHORIZED_MESSAGE),
      ).toBeTruthy();
    });

    it('should return error message on request with isAdmin field on updateBody', async () => {
      const response = await updateUser({ ...updateInput, isAdmin: true });

      expect(response.errors?.map((error) => error.message)[0]).toBe(
        'Variable "$updateBody" got invalid value { name: "newUser", email: "new.user@example.com", isAdmin: true }; Field "isAdmin" is not defined by type "UpdateUserProfileInput".',
      );
    });
  });

  describe('Success cases', () => {
    it('should return updated user data on success request', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await updateUser(updateInput, {
        accessToken,
      });

      expect(
        Object.keys(
          (response.data as UpdateUserProfileResponse).updateUserProfile,
        ),
      ).toEqual(['id', 'name', 'email', 'isAdmin']);
    });

    it('should update user in database on success request', async () => {
      const user = await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });

      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      await updateUser(updateInput, {
        accessToken,
      });

      const updatedUser = await userModel.findById(user.id);

      expect(user.name).not.toBe(updatedUser.name);
      expect(user.email).not.toBe(updatedUser.email);
    });
  });
});
