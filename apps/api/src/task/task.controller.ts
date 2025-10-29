import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskDto,
} from '@turbovets-task-manager/shared-types';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: User
  ): Promise<TaskDto> {
    return this.taskService.create(createTaskDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: User): Promise<TaskDto[]> {
    return this.taskService.findAll(user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<TaskDto> {
    return this.taskService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: User
  ): Promise<TaskDto> {
    return this.taskService.update(id, updateTaskDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<void> {
    await this.taskService.remove(id, user);
  }
}
