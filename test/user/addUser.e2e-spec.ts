import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest-graphql';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import corsOptions from '../../src/corsOptions';
import { BAD_REQUEST } from '../utils/constants';
import { Connection } from 'mongoose';

import { User } from '../../src/user/user.model';
import { AppModule } from '../../src/app.module';
import { addUserMutation } from './userMutations';

describe('Add user (e2e)', () => {
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

  const userInput: AddUserInput = {
    name: 'user',
    email: 'user@example.com',
    password: '#P4ssw0rd',
  };

  const addUser = (addUserInput: AddUserInput = {}) =>
    request(app.getHttpServer())
      .path('/api/graphql')
      .query(addUserMutation)
      .variables({ addUserInput });

  type AddUserResponse = {
    addUser: Omit<User, 'password' | 'refreshTokenVersion'>;
  };

  describe('Fail cases', () => {
    it.each`
      field
      ${'name'}
      ${'email'}
      ${'password'}
    `(
      'should return error message when there is no $field input field',
      async ({ field }) => {
        const input = { ...userInput, [field]: undefined };
        const response = await addUser(input);

        expect(
          response.errors
            ?.map((error) => error.message)[0]
            .includes(`Field \"${field}\" of required type`),
        ).toBeTruthy();
      },
    );

    it.each`
      name                       | case
      ${'Jo'}                    | ${'less than 3 characters'}
      ${'veryBadLargeUserName!'} | ${'more than 20 characters'}
    `('should return error message when name has $case', async ({ name }) => {
      const input = { ...userInput, name };
      const response = await addUser(input);

      expect(response.errors?.map((error) => error.message)[0]).toBe(
        BAD_REQUEST,
      );
    });

    it('should return error message when email is invalid', async () => {
      const input = { ...userInput, email: 'user' };
      const response = await addUser(input);

      expect(response.errors?.map((error) => error.message)[0]).toBe(
        BAD_REQUEST,
      );
    });

    it.each`
      password                   | case
      ${'pass'}                  | ${'has less than 8 characters'}
      ${'veryBadLargePassword!'} | ${'has more than 20 characters'}
      ${'#P4SSW0RD'}             | ${'has no lowercase character'}
      ${'#p4ssw0rd'}             | ${'has no uppercase character'}
      ${'#Password'}             | ${'has no numeric character'}
      ${'P4ssword'}              | ${'has no special character'}
    `(
      'should return error message when password $case',
      async ({ password }) => {
        const input = { ...userInput, password };
        const response = await addUser(input);

        expect(response.errors?.map((error) => error.message)[0]).toBe(
          BAD_REQUEST,
        );
      },
    );
  });

  describe('Success cases', () => {
    it('should return product data on success request', async () => {
      const response = await addUser(userInput);

      expect(Object.keys((response.data as AddUserResponse).addUser)).toEqual([
        'id',
        'name',
        'email',
        'isAdmin',
      ]);
    });

    it('should save product in database on success request', async () => {
      const response = await addUser(userInput);

      const user = await userModel.findById(
        (response.data as AddUserResponse).addUser.id,
      );

      expect(user).toBeTruthy();

      expect(user?.name).toBe(userInput.name);

      expect(user?.email).toBe(userInput.email);

      expect(user?.isAdmin).toBe(false);
    });
  });
});
