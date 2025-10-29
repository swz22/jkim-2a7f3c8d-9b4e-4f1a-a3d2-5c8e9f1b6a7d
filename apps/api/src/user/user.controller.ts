import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import {
  AddUserDto,
  UserDto,
  AddUserResponseDto,
} from '@turbovets-task-manager/shared-types';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  async addUser(
    @Body() addUserDto: AddUserDto,
    @CurrentUser() currentUser: User
  ): Promise<AddUserResponseDto> {
    return this.userService.addUser(addUserDto, currentUser);
  }

  @Get()
  async findAll(@CurrentUser() currentUser: User): Promise<UserDto[]> {
    return this.userService.findAllInOrganization(currentUser);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: User
  ): Promise<UserDto> {
    return this.userService.findOne(id, currentUser);
  }
}
