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
  BAD_INT_INPUT,
  BAD_STRING_INPUT,
} from '../utils/constants';
import { Connection } from 'mongoose';

import { User } from '../../src/user/user.model';
import { hash } from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { getUserQuery, getUsersQuery } from './userQueries';
import { loginMutation } from './authMutations';

describe('Get Users (e2e)', () => {
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

  const createUsers = async (usersNumber = 1) => {
    for (let i = 0; i < usersNumber; i++) {
      await userModel.create({
        name: `user${i}`,
        email: `user${i}@example.com`,
        password: `password${i}`,
      });
    }
  };

  const deleteUser = async (userId: string) =>
    userModel.findByIdAndDelete(userId);

  type GetUsersInput = {
    pageSize?: any;
    pageNumber?: any;
    keyword?: any;
  };

  type GetUsersResponse = {
    getUsers: {
      users: Omit<User, 'password' | 'refreshTokenVersion'>[];
      pages: number;
      page: number;
    };
  };

  const getUsers = (
    getUsersInput: GetUsersInput = {
      pageNumber: 1,
      pageSize: 10,
      keyword: '',
    },
    options: { accessToken?: string } = {},
  ) => {
    const agent = request(app.getHttpServer())
      .path('/api/graphql')
      .query(getUsersQuery)
      .variables({ getUsersInput });

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
    it('should  return error message on request without accessToken (logged user)', async () => {
      const response = await getUsers({
        pageNumber: 1,
        pageSize: 1,
        keyword: '',
      });

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(UNAUTHORIZED_MESSAGE),
      ).toBeTruthy();
    });

    it('should  return error message when logged user is not and admin', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      const response = await getUsers(
        {
          pageNumber: 1,
          pageSize: 1,
          keyword: '',
        },
        { accessToken },
      );

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(UNAUTHORIZED_MESSAGE),
      ).toBeTruthy();
    });

    it('should  return error message when pageSize argument is not a number', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      const response = await getUsers(
        {
          pageNumber: 1,
          pageSize: '',
          keyword: '',
        },
        { accessToken },
      );

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(BAD_INT_INPUT),
      ).toBeTruthy();
    });

    it('should  return error message when pageNumber argument is not a number', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await getUsers(
        {
          pageNumber: '',
          pageSize: 1,
          keyword: '',
        },
        { accessToken },
      );

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(BAD_INT_INPUT),
      ).toBeTruthy();
    });

    it('should  return error messages when both pageSize and pageNumber arguments are not numbers', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await getUsers(
        {
          pageNumber: '',
          pageSize: '',
          keyword: '',
        },
        { accessToken },
      );

      response.errors?.forEach((error) =>
        expect(error.message.includes(BAD_INT_INPUT)).toBeTruthy(),
      );
    });

    it('should  return error message when keyword argument is not a string', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;

      const response = await getUsers(
        {
          pageNumber: 1,
          pageSize: 1,
          keyword: 1,
        },
        { accessToken },
      );

      expect(
        response.errors
          ?.map((error) => error.message)[0]
          .includes(BAD_STRING_INPUT),
      ).toBeTruthy();
    });
  });

  describe('Bad inputs returning default properties cases', () => {
    it('should return first page when pageNumber argument is below 1', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      await createUsers(1);

      const response = await getUsers(
        {
          pageNumber: -5,
          pageSize: 1,
          keyword: '',
        },
        { accessToken },
      );

      expect((response.data as GetUsersResponse).getUsers.users.length).toBe(1);
      expect((response.data as GetUsersResponse).getUsers.page).toBe(1);
      expect((response.data as GetUsersResponse).getUsers.pages).toBe(2);
    });

    it('should return first page when pageNumber parameter is greater than current possible pages', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      await createUsers(1);

      const response = await getUsers(
        {
          pageNumber: 2,
          pageSize: 1,
          keyword: '',
        },
        { accessToken },
      );

      expect((response.data as GetUsersResponse).getUsers.users.length).toBe(1);
      expect((response.data as GetUsersResponse).getUsers.page).toBe(2);
      expect((response.data as GetUsersResponse).getUsers.pages).toBe(2);
    });

    it('should set pageSize to 12 and return correct products and pagination data when pageSize argument is below 1', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      await createUsers(13);

      const response = await getUsers(
        {
          pageNumber: 2,
          pageSize: 0,
          keyword: '',
        },
        { accessToken },
      );

      expect((response.data as GetUsersResponse).getUsers.users.length).toBe(2);
      expect((response.data as GetUsersResponse).getUsers.page).toBe(2);
      expect((response.data as GetUsersResponse).getUsers.pages).toBe(2);
    });
  });

  describe('Success cases', () => {
    it('should return page object as response body', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      await createUsers(1);

      const response = await getUsers(
        {
          pageNumber: 1,
          pageSize: 1,
          keyword: '',
        },
        { accessToken },
      );

      expect((response.data as GetUsersResponse).getUsers.users.length).toBe(1);
      expect((response.data as GetUsersResponse).getUsers.page).toBe(1);
      expect((response.data as GetUsersResponse).getUsers.pages).toBe(2);
    });

    it('should return correct products and pagination data', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      await createUsers(11);

      const response = await getUsers(
        {
          pageNumber: 1,
          pageSize: 10,
          keyword: '',
        },
        { accessToken },
      );

      expect((response.data as GetUsersResponse).getUsers.users.length).toBe(
        10,
      );
      expect((response.data as GetUsersResponse).getUsers.page).toBe(1);
      expect((response.data as GetUsersResponse).getUsers.pages).toBe(2);
    });

    it('should return correct products and pagination data when keyword is provided', async () => {
      await register({
        ...VALID_CREDENTIALS,
        name: 'user',
        isAdmin: true,
      });
      const loginResponse = await login(VALID_CREDENTIALS);
      const accessToken = (loginResponse.data as LoginResponse).login
        .accessToken;
      await createUsers(11);

      const response = await getUsers(
        {
          pageNumber: 1,
          pageSize: 10,
          keyword: 'user8',
        },
        { accessToken },
      );

      expect((response.data as GetUsersResponse).getUsers.users.length).toBe(1);

      expect((response.data as GetUsersResponse).getUsers.users[0].name).toBe(
        'user8',
      );
      expect((response.data as GetUsersResponse).getUsers.page).toBe(1);
      expect((response.data as GetUsersResponse).getUsers.pages).toBe(1);
    });
  });
});
