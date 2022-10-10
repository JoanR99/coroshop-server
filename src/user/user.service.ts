import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { BaseService } from 'src/shared/base.service';
import { UpdateUserInput, UpdateUserProfileInput } from './user.types';
import { User } from './user.model';
import { sign, verify } from 'jsonwebtoken';
import { hash, compare } from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

export type TokenPayload = {
  userId: string;
  tokenVersion: number;
  isAdmin: boolean;
};

type QueryUsers = { name: { $regex: string; $options: string } } | {};

@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    @InjectModel(User.modelName)
    private readonly userModel: ReturnModelType<typeof User>,
  ) {
    super(userModel);
  }

  private readonly accessTokenSecret = process.env
    .ACCESS_TOKEN_SECRET as string;
  private readonly refreshTokenSecret = process.env
    .REFRESH_TOKEN_SECRET as string;

  countByRegex(keyword: QueryUsers) {
    return this.userModel.countDocuments({ ...keyword });
  }

  async findByIdAndUpdate(
    userId: string,
    updateBody: UpdateUserProfileInput | UpdateUserInput,
  ) {
    if ('password' in updateBody) {
      const hashedPassword = await hash(updateBody.password!, 10);
      updateBody.password = hashedPassword;
    }

    return this.userModel.findByIdAndUpdate(userId, updateBody, { new: true });
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  validateToken(token: string, publicKey: string) {
    return verify(token, publicKey) as TokenPayload;
  }

  hash(password: string) {
    return hash(password, 10);
  }

  compare(password: string, encryptedPassword: string) {
    return compare(password, encryptedPassword);
  }

  createAccessToken(body: { userId: string; isAdmin: boolean }) {
    return sign(body, this.accessTokenSecret, {
      expiresIn: '15m',
    });
  }

  createRefreshToken(body: {
    userId: string;
    tokenVersion: number;
    isAdmin: boolean;
  }) {
    return sign(body, this.refreshTokenSecret, {
      expiresIn: '7d',
    });
  }
}
