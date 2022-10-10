import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class ApiService {
  private readonly stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2022-08-01',
  });

  createPayment(amount: number) {
    return this.stripe.paymentIntents.create({
      amount: Math.floor(Number(amount)),
      currency: 'usd',
      payment_method_types: ['card'],
    });
  }
}
