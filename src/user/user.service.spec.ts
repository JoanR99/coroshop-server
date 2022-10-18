import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { UserService } from './user.service';
import { User } from './user.model';
import { Types } from 'mongoose';

describe('Product Service', () => {
  let userService: UserService;
  let userModel: ReturnModelType<typeof User>;

  const userDTO = {
    name: 'user',
    email: 'user@example.com',
    password: 'password',
    isAdmin: false,
  };

  const id = '63482cd0316e058ac32adfe8';

  const keywordRegex = {
    name: {
      $regex: 'productName',
      $options: 'i',
    },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    })
      .useMocker((token) => {
        if (token === getModelToken(User.name)) {
          return {
            findById: jest.fn().mockResolvedValue(userDTO),
            create: jest.fn().mockResolvedValue(userDTO),
            findByIdAndDelete: jest.fn().mockResolvedValue(userDTO),
            findByIdAndUpdate: jest.fn().mockResolvedValue(userDTO),
            countDocuments: jest.fn().mockResolvedValue(1),
            find: jest.fn().mockResolvedValue([]),
          };
        }
      })
      .compile();

    userService = moduleFixture.get<UserService>(UserService);
    userModel = moduleFixture.get<ReturnModelType<typeof User>>(
      getModelToken(User.name),
    );
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const user = await userService.create(userDTO);
      expect(user).toMatchObject(userDTO);
      expect(userModel.create).toHaveBeenCalledWith(userDTO);
    });
  });

  describe('findById', () => {
    it('should find an user', async () => {
      const user = await userService.findById(id);
      expect(user).toMatchObject(userDTO);
      expect(userModel.findById).toHaveBeenCalledWith(new Types.ObjectId(id));
    });
  });

  describe('deleteById', () => {
    it('should delete an user', async () => {
      await userService.deleteById(id);
      expect(userModel.findByIdAndDelete).toHaveBeenCalledWith(
        new Types.ObjectId(id),
      );
    });
  });

  describe('update', () => {
    it('should update an user', async () => {
      const user = await userService.update(id, userDTO);
      expect(user).toMatchObject(userDTO);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        new Types.ObjectId(id),
        { ...userDTO },
        { new: true },
      );
    });
  });

  describe('count', () => {
    it('should count users by regex', async () => {
      const count = await userService.count(keywordRegex);
      expect(count).toBe(1);
      expect(userModel.countDocuments).toHaveBeenCalledWith(keywordRegex);
    });
  });

  describe('findAll', () => {
    it('should find users by regex', async () => {
      const users = await userService.findAll(keywordRegex);
      expect(users).toMatchObject([]);
      expect(userModel.find).toHaveBeenCalledWith(keywordRegex);
    });
  });
});
