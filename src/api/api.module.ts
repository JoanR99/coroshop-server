import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { ApiService } from './api.service';
import { ApiController } from './api.controller';

@Module({
  imports: [UserModule],
  providers: [ApiService, ApiController],
  controllers: [ApiController],
})
export class ApiModule {}
