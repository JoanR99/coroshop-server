import { Test, TestingModule } from '@nestjs/testing';
import { UserResolver } from './user.resolver';
import { UserService } from '../user/user.service';
import { AuthService } from '../user/auth.service';

describe('user Service', () => {
  let userResolver: UserResolver;
  let authService: AuthService;
  let userService: UserService;

  const id = '63482cd0316e058ac32adfe8';
  const userResponse = {
    id,
    name: 'user',
    email: 'user@example.com',
    isAdmin: false,
  };

  const user = {
    ...userResponse,
    refreshTokenVersion: 3,
    password: 'password',
  };

  const addUserDTO = {
    name: 'user',
    email: 'user@example.com',
    password: 'password',
  };

  const updateUserDTO = {
    name: 'user',
    email: 'user@example.com',
  };

  const hashedPassword = 'hashed-password';

  const cookie = jest.fn();
  const clearCookie = jest.fn();

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [UserResolver],
    })
      .useMocker((token) => {
        if (token === UserService) {
          return {
            findById: jest
              .fn()
              .mockImplementation((userId) => (userId === id ? user : null)),
            findByEmail: jest
              .fn()
              .mockImplementation((email) =>
                email === user.email ? user : null,
              ),
            deleteById: jest
              .fn()
              .mockImplementation((userId) => (userId === id ? user : null)),
            create: jest.fn().mockResolvedValue(user),
            update: jest
              .fn()
              .mockImplementation((userId) => (userId === id ? user : null)),
            count: jest.fn().mockResolvedValue(3),
            findAll: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            skip: jest.fn().mockResolvedValue(['user1', 'user2', 'user3']),
            select: jest.fn().mockReturnThis(),
          };
        }
        if (token === AuthService) {
          return {
            hash: jest.fn().mockResolvedValue(hashedPassword),
            compare: jest
              .fn()
              .mockImplementation((password) =>
                password === addUserDTO.password ? true : false,
              ),
            createAccessToken: jest.fn().mockReturnValue('access-token'),
            createRefreshToken: jest.fn().mockReturnValue('refresh-token'),
          };
        }
      })
      .compile();
    userResolver = moduleFixture.get<UserResolver>(UserResolver);
    authService = moduleFixture.get<AuthService>(AuthService);
    userService = moduleFixture.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(userResolver).toBeDefined();
  });

  describe('getUsers', () => {
    it('should get users with pagination data', async () => {
      const getUsersData = await userResolver.getUsers({
        pageNumber: 1,
        pageSize: 1,
        keyword: '',
      });

      expect(getUsersData).toMatchObject({
        users: ['user1', 'user2', 'user3'],
        page: 1,
        pages: 3,
      });

      expect(userService.count).toHaveBeenCalledWith({});
      expect(userService.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('getUser', () => {
    it('should get user', async () => {
      const user = await userResolver.getUser(id);
      expect(user).toMatchObject(userResponse);
      expect(userService.findById).toHaveBeenCalledWith(id);
    });

    it('should throw error if user not found', async () => {
      await expect(
        userResolver.getUser('63482cd0316e058ac32adfe2'),
      ).rejects.toThrowError();
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile', async () => {
      const user = await userResolver.getUserProfile(id);
      expect(user).toMatchObject(userResponse);
      expect(userService.findById).toHaveBeenCalledWith(id);
    });

    it('should throw error if user not found', async () => {
      await expect(
        userResolver.getUserProfile('63482cd0316e058ac32adfe2'),
      ).rejects.toThrowError();
    });
  });

  describe('addUser', () => {
    it('should add an user', async () => {
      const user = await userResolver.addUser(addUserDTO);
      expect(user).toMatchObject(userResponse);
      expect(userService.create).toHaveBeenCalledWith({
        ...addUserDTO,
        password: hashedPassword,
      });
      expect(authService.hash).toHaveBeenCalledWith(addUserDTO.password);
    });
  });

  describe('deleteUser', () => {
    it('should delete an user', async () => {
      const response = await userResolver.deleteUser(id);
      expect(response).toMatchObject({
        message: 'User deleted',
      });
      expect(userService.deleteById).toHaveBeenCalledWith(id);
    });

    it('should throw error if user not found', async () => {
      await expect(
        userResolver.deleteUser('63482cd0316e058ac32adfe2'),
      ).rejects.toThrowError();
    });
  });

  describe('updateUser', () => {
    it('should update an user', async () => {
      const user = await userResolver.updateUser(
        { ...updateUserDTO, isAdmin: false },
        id,
      );
      expect(user).toMatchObject(userResponse);
      expect(userService.update).toHaveBeenCalledWith(id, {
        ...updateUserDTO,
        isAdmin: false,
      });
    });

    it('should throw error if user not found', async () => {
      await expect(
        userResolver.updateUser(
          { ...updateUserDTO, isAdmin: false },
          '63482cd0316e058ac32adfe2',
        ),
      ).rejects.toThrowError();
    });
  });

  describe('updateUserProfile', () => {
    it('should update an user profile', async () => {
      const user = await userResolver.updateUserProfile(id, {
        ...updateUserDTO,
        password: 'new-password',
      });
      expect(user).toMatchObject(userResponse);
      expect(userService.update).toHaveBeenCalledWith(id, {
        ...updateUserDTO,
        password: hashedPassword,
      });
    });

    it('should throw error if user not found', async () => {
      await expect(
        userResolver.updateUserProfile('63482cd0316e058ac32adfe2', {
          ...updateUserDTO,
          password: 'new-password',
        }),
      ).rejects.toThrowError();
    });
  });

  describe('login', () => {
    it('should return accessToken with valid credentials', async () => {
      const accessToken = await userResolver.login(
        { email: addUserDTO.email, password: addUserDTO.password },
        { cookie } as any,
      );
      expect(accessToken).toMatchObject({ accessToken: 'access-token' });
      expect(authService.compare).toHaveBeenCalledWith(
        addUserDTO.password,
        user.password,
      );
      expect(authService.createRefreshToken).toHaveBeenCalledWith({
        userId: user.id,
        tokenVersion: user.refreshTokenVersion,
        isAdmin: user.isAdmin,
      });
      expect(cookie).toHaveBeenCalled();
    });

    it('should return throw error with invalid credentials', async () => {
      await expect(
        userResolver.login({ email: addUserDTO.email, password: 'pass' }, {
          cookie,
        } as any),
      ).rejects.toThrowError();
    });
  });

  describe('logout', () => {
    it('should return success message', () => {
      const message = userResolver.logout({ clearCookie } as any);
      expect(message).toMatchObject({ message: 'Logout success' });
      expect(clearCookie).toHaveBeenCalled();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should return success message', async () => {
      const message = await userResolver.revokeRefreshToken(id);
      expect(message).toMatchObject({ message: 'Token revoked' });
      expect(userService.findById).toHaveBeenCalledWith(id);
      expect(userService.update).toHaveBeenCalledWith(id, {
        refreshTokenVersion: 4,
      });
    });

    it('should return throw error with invalid id', async () => {
      await expect(
        userResolver.revokeRefreshToken('bad-id'),
      ).rejects.toThrowError();
    });
  });
});
