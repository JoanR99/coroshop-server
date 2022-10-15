import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import corsOptions from './corsOptions';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(corsOptions as any);
  await app.listen(3000);
}
bootstrap();
