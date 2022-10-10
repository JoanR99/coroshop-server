import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { UserService } from './user/user.service';
dotenv.config();

export type RequestWithAuth = Request & {
  headers: {
    authorization?: string;
    Authorization?: string;
  };
  payload?: { userId: string; tokenVersion: number; isAdmin: boolean };
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private userService: UserService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.getArgByIndex(2).req;

    try {
      const authHeader =
        request.headers.authorization || request.headers.Authorization;

      if (typeof authHeader === 'undefined' || Array.isArray(authHeader))
        return false;

      if (!authHeader?.startsWith('Bearer ')) return false;

      const token = authHeader.split(' ')[1];

      const publicKey = process.env.ACCESS_TOKEN_SECRET!;

      const tokenPayload = this.userService.validateToken(token, publicKey);

      request.payload = tokenPayload;

      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }
}
