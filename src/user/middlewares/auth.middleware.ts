import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';
import { AuthService } from '../auth.service';

export type TokenPayload = {
  userId: string;
  tokenVersion?: number;
  isAdmin: boolean;
};

declare global {
  namespace Express {
    interface Request {
      payload?: TokenPayload;
    }
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private authService: AuthService) {}
  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (
      typeof authHeader === 'undefined' ||
      Array.isArray(authHeader) ||
      !authHeader?.startsWith('Bearer ')
    )
      return next();

    const token = authHeader.split(' ')[1];

    try {
      const tokenPayload = this.authService.validateAccessToken(token);
      req.payload = tokenPayload;
      next();
    } catch (e) {
      return next();
    }
  }
}
