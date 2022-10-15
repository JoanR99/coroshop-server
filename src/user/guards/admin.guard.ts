import { CanActivate, Injectable, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.getArgByIndex(2).req;

    return request.payload?.isAdmin;
  }
}
