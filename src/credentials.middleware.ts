import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import allowedOrigins from './allowedOrigins';

@Injectable()
export class CredentialsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers.origin ?? '';
    if (allowedOrigins.includes(origin)) {
      req.headers['access-control-allow-credentials'] = 'true';
    }
    next();
  }
}
