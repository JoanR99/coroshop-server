import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from '../user/user.service';

import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { Res } from '../req.decorators';
import { UserId } from './decorators/userId.decorator';
import { MutationBasicResponse, GetItemsInput } from '../shared/shared.dto';
import { User } from './user.model';
import {
  AddUserInput,
  UpdateUserInput,
  UpdateUserProfileInput,
  LoginInput,
  LoginResponse,
  GetUsersResponse,
  UserResponse,
} from './user.dto';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Resolver()
export class UserResolver {
  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) {}

  @Query(() => GetUsersResponse)
  @UseGuards(AuthGuard, AdminGuard)
  async getUsers(
    @Args('getUsersInput') { pageNumber, pageSize, keyword }: GetItemsInput,
  ): Promise<GetUsersResponse> {
    const keywordRegex = keyword
      ? {
          name: {
            $regex: keyword,
            $options: 'i',
          },
        }
      : {};

    const count = await this.userService.count(keywordRegex);

    const pageLength = !pageSize || pageSize < 1 ? 12 : pageSize;

    const pages = Math.ceil(count / pageLength);

    const page =
      !pageNumber || pageNumber < 1 || pageNumber > pages ? 1 : pageNumber;

    const users = await this.userService
      .findAll(keywordRegex)
      .select('-password -refreshTokenVersion')
      .limit(pageLength)
      .skip(pageLength * (page - 1));

    return {
      users,
      page,
      pages,
    };
  }

  @Query(() => User)
  @UseGuards(AuthGuard)
  async getUserProfile(@UserId() userId: string): Promise<UserResponse> {
    const user = await this.userService.findById(userId);

    if (!user) throw new Error('User not found');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    };
  }

  @Query(() => User)
  @UseGuards(AuthGuard, AdminGuard)
  async getUser(@Args('userId') userId: string): Promise<UserResponse> {
    const user = await this.userService.findById(userId);

    if (!user) throw new Error('User not found');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    };
  }

  @Mutation(() => User)
  async addUser(
    @Args('addUserInput')
    { name, email, password }: AddUserInput,
  ): Promise<UserResponse> {
    const hashedPassword = await this.authService.hash(password);

    const user = await this.userService.create({
      name,
      email,
      password: hashedPassword,
    });

    return user;
  }

  @Mutation(() => User)
  @UseGuards(AuthGuard)
  async updateUserProfile(
    @UserId() userId: string,
    @Args('updateBody') updateBody: UpdateUserProfileInput,
  ): Promise<UserResponse> {
    if ('password' in updateBody) {
      updateBody.password = await this.authService.hash(updateBody.password);
    }
    const updatedUser = await this.userService.update(userId, updateBody);

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
    };
  }

  @Mutation(() => User)
  @UseGuards(AuthGuard, AdminGuard)
  async updateUser(
    @Args('updateBody') updateBody: UpdateUserInput,
    @Args('userId') userId: string,
  ): Promise<UserResponse> {
    const updatedUser = await this.userService.update(userId, updateBody);

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
    };
  }

  @Mutation(() => MutationBasicResponse)
  @UseGuards(AuthGuard, AdminGuard)
  async deleteUser(
    @Args('userId') userId: string,
  ): Promise<MutationBasicResponse> {
    const user = await this.userService.deleteById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      message: 'User deleted',
    };
  }

  @Mutation(() => LoginResponse)
  async login(
    @Args('loginInput') { email, password }: LoginInput,
    @Res() res: Response,
  ): Promise<LoginResponse> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new Error('User not found');
    }

    const match = await this.authService.compare(password, user.password);

    if (!match) {
      throw new Error('Wrong credentials');
    }

    await this.userService.update(user.id, {
      refreshTokenVersion: user.refreshTokenVersion + 1,
    });

    const accessToken = this.authService.createAccessToken({
      userId: user.id,
      isAdmin: user.isAdmin,
    });
    const refreshToken = this.authService.createRefreshToken({
      userId: user.id,
      tokenVersion: user.refreshTokenVersion,
      isAdmin: user.isAdmin,
    });

    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return {
      accessToken,
    };
  }

  @Mutation(() => MutationBasicResponse)
  logout(@Res() res: Response): MutationBasicResponse {
    res.clearCookie('jwt', {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return { message: 'Logout success' };
  }

  @Mutation(() => MutationBasicResponse)
  async revokeRefreshToken(
    @Args('userId') userId: string,
  ): Promise<MutationBasicResponse> {
    const user = await this.userService.findById(userId);

    if (!user) throw new Error('User not found');

    await this.userService.update(user.id, {
      refreshTokenVersion: user.refreshTokenVersion + 1,
    });

    return { message: 'Token revoked' };
  }
}
