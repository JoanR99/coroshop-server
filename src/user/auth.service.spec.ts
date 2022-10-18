import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('Product Service', () => {
  let authService: AuthService;

  const id = '63482cd0316e058ac32adfe8';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    authService = moduleFixture.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('hash', () => {
    it('should hash a password', async () => {
      const hash = await authService.hash('password');
      expect(hash).not.toBe('password');
    });
  });

  describe('compare', () => {
    it('should return true if passwords match', async () => {
      const hash = await authService.hash('password');
      const result = await authService.compare('password', hash);
      expect(result).toBeTruthy();
    });

    it('should return false if passwords does not match', async () => {
      const hash = await authService.hash('password');
      const result = await authService.compare('pass', hash);
      expect(result).toBeFalsy();
    });
  });

  describe('createAccessToken', () => {
    it('should create access token', () => {
      const accessToken = authService.createAccessToken({
        userId: id,
        isAdmin: false,
      });

      expect(accessToken).toBeTruthy();
    });
  });

  describe('createRefreshToken', () => {
    it('should create refresh token', () => {
      const refreshToken = authService.createRefreshToken({
        userId: id,
        tokenVersion: 1,
        isAdmin: false,
      });

      expect(refreshToken).toBeTruthy();
    });
  });

  describe('validateAccessToken', () => {
    it('should return token payload if token is valid', () => {
      const accessToken = authService.createAccessToken({
        userId: id,
        isAdmin: false,
      });

      const TokenPayload = authService.validateAccessToken(accessToken);

      expect(TokenPayload).toMatchObject({ userId: id, isAdmin: false });
    });
  });

  describe('validateRefreshToken', () => {
    it('should return token payload if token is valid', () => {
      const refreshToken = authService.createRefreshToken({
        userId: id,
        tokenVersion: 1,
        isAdmin: false,
      });

      const TokenPayload = authService.validateRefreshToken(refreshToken);

      expect(TokenPayload).toMatchObject({
        userId: id,
        tokenVersion: 1,
        isAdmin: false,
      });
    });
  });
});
