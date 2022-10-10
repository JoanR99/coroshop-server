import { NestFactory } from '@nestjs/core';
import { CorsOptions } from 'apollo-server-express';
import { AppModule } from './app.module';
import corsOptions from './corsOptions';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(corsOptions as any);
  app.use(cookieParser());
  await app.listen(3000);
}
bootstrap();
