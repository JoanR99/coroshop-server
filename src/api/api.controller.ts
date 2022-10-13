import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { AuthService } from 'src/user/auth.service';
import { UserService } from 'src/user/user.service';
import { Request, Response } from 'express';
import * as dotenv from 'dotenv';
import { ApiService } from './api.service';
dotenv.config();

@Controller('api')
export class ApiController {
  constructor(
    private userService: UserService,
    private authService: AuthService,
    private apiService: ApiService,
  ) {}

  @Get('refresh_token')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    let tokenPayload: any = null;

    const cookies = req.cookies;

    if (!cookies?.jwt) return res.sendStatus(401);

    const refreshToken = cookies.jwt;

    tokenPayload = this.authService.validateRefreshToken(refreshToken);

    const user = await this.userService.findById(tokenPayload.userId);

    if (!user || user.refreshTokenVersion !== tokenPayload.tokenVersion)
      return res.sendStatus(403);

    const accessToken = this.authService.createAccessToken({
      userId: tokenPayload.userId,
      isAdmin: tokenPayload.isAdmin,
    });

    return res.json({ accessToken });
  }

  @Get('clientId')
  clientId() {
    const clientId = process.env.PAYPAL_CLIENT_ID!;

    return { clientId };
  }

  @Post('stripe')
  async stripe(@Req() req: Request) {
    const { amount } = req.body;

    const paymentIntent = await this.apiService.createPayment(amount);

    return { clientSecret: paymentIntent.client_secret };
  }
}
