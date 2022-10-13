import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from './user/auth.service';

export type RequestWithAuth = Request & {
  headers: {
    authorization?: string;
    Authorization?: string;
  };
  payload?: { userId: string; tokenVersion: number; isAdmin: boolean };
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.getArgByIndex(2).req;

    try {
      const authHeader =
        request.headers.authorization || request.headers.Authorization;

      if (
        typeof authHeader === 'undefined' ||
        Array.isArray(authHeader) ||
        !authHeader?.startsWith('Bearer ')
      )
        return false;

      const token = authHeader.split(' ')[1];

      const tokenPayload = this.authService.validateAccessToken(token);

      if (!tokenPayload.userId) return false;

      request.payload = tokenPayload;

      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }
}
