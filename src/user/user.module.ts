import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { User } from './user.model';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.modelName, schema: User.schema }]),
  ],
  providers: [UserService, AuthService, UserResolver],
  exports: [UserService, AuthService],
})
export class UserModule {}
