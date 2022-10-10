import { CanActivate, Injectable, ExecutionContext } from '@nestjs/common';
import { RequestWithAuth } from './auth.guard';
import { UserService } from './user/user.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private userService: UserService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.getArgByIndex(2).req;
    const userId = request.payload.userId;
    const isAdmin = request.payload.isAdmin;

    try {
      if (isAdmin) {
        const user = await this.userService.findById(userId);
        if (user?.isAdmin) {
          return true;
        }
      }

      return false;
    } catch (e) {
      return false;
    }
  }
}
