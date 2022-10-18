import { Injectable } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { hash, compare } from 'bcrypt';
import { TokenPayload } from './middlewares/auth.middleware';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class AuthService {
  validateAccessToken(token) {
    return verify(token, process.env.ACCESS_TOKEN_SECRET) as Omit<
      TokenPayload,
      'tokenVersion'
    >;
  }

  validateRefreshToken(token) {
    return verify(token, process.env.REFRESH_TOKEN_SECRET) as TokenPayload;
  }

  hash(password: string) {
    return hash(password, 10);
  }

  compare(password: string, encryptedPassword: string) {
    return compare(password, encryptedPassword);
  }

  createAccessToken(body: { userId: string; isAdmin: boolean }) {
    return sign(body, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '15m',
    });
  }

  createRefreshToken(body: {
    userId: string;
    tokenVersion: number;
    isAdmin: boolean;
  }) {
    return sign(body, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: '7d',
    });
  }
}
