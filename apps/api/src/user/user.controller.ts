import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../database/entities/user.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { AddUserDto, UserDto } from '@turbovets-task-manager/shared-types';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  addUser(
    @Body() addUserDto: AddUserDto,
    @CurrentUser() user: User
  ): Promise<UserDto> {
    return this.userService.addUser(addUserDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: User): Promise<UserDto[]> {
    return this.userService.findAllInOrganization(user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<UserDto> {
    return this.userService.findOne(id, user);
  }
}
