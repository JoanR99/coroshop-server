import { Field, ObjectType, InputType, Int } from '@nestjs/graphql';
import { Length, IsEmail } from 'class-validator';
import { User } from './user.model';
import { isValidPassword } from './isValidPassword';
import { GetPaginatedResponse } from '../shared/shared.dto';

@InputType()
export class AddUserInput implements Partial<User> {
  @Field()
  @Length(3, 20, { message: 'Name must be between 3 and 20 characters long' })
  name!: string;

  @Field()
  @IsEmail({ message: 'Invalid Email' })
  email!: string;

  @Field()
  @Length(8, 20, {
    message: 'Password must be between 8 and 20 characters long',
  })
  @isValidPassword({
    message:
      'Password must contain at least a lowercase letter, a uppercase letter, a number and a special character ( ! @ # $ % )',
  })
  password!: string;
}

@InputType()
export class UpdateUserProfileInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  password?: string;
}

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  isAdmin?: boolean;
}

@InputType()
export class LoginInput implements Partial<User> {
  @Field()
  @IsEmail({ message: 'Invalid Email' })
  email!: string;

  @Field()
  password!: string;
}

@ObjectType()
export class GetUsersResponse extends GetPaginatedResponse {
  @Field((type) => [User])
  users: User[];
}

@ObjectType()
export class UserResponse {
  @Field({ nullable: true })
  id?: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  isAdmin: boolean;
}

@ObjectType()
export class LoginResponse {
  @Field()
  accessToken: string;
}
