import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from 'apollo-server-core';
import { join } from 'path';
import { ProductModule } from './product/product.module';
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';
import { ReviewModule } from './review/review.module';
import { CredentialsMiddleware } from './credentials.middleware';
import { ApiModule } from './api/api.module';
import * as dotenv from 'dotenv';
import * as cookieParser from 'cookie-parser';
dotenv.config();

const MONGO_URI: string =
  process.env.NODE_ENV === 'production'
    ? process.env.MONGO_URI
    : process.env.NODE_ENV === 'development'
    ? process.env.MONGO_URI_DEV
    : process.env.MONGO_URI_TEST;

@Module({
  imports: [
    ApiModule,
    ProductModule,
    UserModule,
    OrderModule,
    ReviewModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      context: ({ req, res }) => ({ req, res }),
      path: '/api/graphql',
      cors: false,
    }),
    MongooseModule.forRoot(MONGO_URI),
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CredentialsMiddleware, cookieParser()).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
