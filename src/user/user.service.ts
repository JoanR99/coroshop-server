import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ReturnModelType } from '@typegoose/typegoose/lib/types';
import { BaseService } from '../shared/base.service';
import { UpdateUserInput, UpdateUserProfileInput } from './user.dto';
import { User } from './user.model';
import { hash } from 'bcrypt';

type QueryUsers = { name: { $regex: string; $options: string } } | {};

@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    @InjectModel(User.modelName)
    private readonly userModel: ReturnModelType<typeof User>,
  ) {
    super(userModel);
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }
}
