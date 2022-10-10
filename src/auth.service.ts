import { verify, sign } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

export type TokenPayload = {
  userId: string;
  tokenVersion: number;
  isAdmin: boolean;
};

const validateToken = (token: string, publicKey: string) =>
  verify(token, publicKey) as TokenPayload;

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET as string;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET as string;

const hash = (password: string): Promise<string> => bcrypt.hash(password, 10);

const compare = (password: string, encryptedPassword: string) =>
  bcrypt.compare(password, encryptedPassword);

const createAccessToken = (body: { userId: string; isAdmin: boolean }) =>
  sign(body, accessTokenSecret, {
    expiresIn: '15m',
  });

const createRefreshToken = (body: {
  userId: string;
  tokenVersion: number;
  isAdmin: boolean;
}) =>
  sign(body, refreshTokenSecret, {
    expiresIn: '7d',
  });

export { hash, validateToken, compare, createAccessToken, createRefreshToken };
