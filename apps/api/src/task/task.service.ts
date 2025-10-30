import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../database/entities/task.entity';
import { User, UserRole } from '../database/entities/user.entity';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskDto,
} from '@turbovets-task-manager/shared-types';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private auditLogService: AuditLogService
  ) {}

  async create(
    createTaskDto: CreateTaskDto,
    currentUser: User
  ): Promise<TaskDto> {
    const task = this.taskRepository.create({
      title: createTaskDto.title,
      description: createTaskDto.description,
      assigneeId: createTaskDto.assigneeId,
      createdById: currentUser.id,
      organizationId: currentUser.organizationId,
    });

    const savedTask = await this.taskRepository.save(task);

    // Log the action
    await this.auditLogService.log(
      'CREATE_TASK',
      'Task',
      savedTask.id,
      currentUser.id,
      currentUser.organizationId,
      { title: savedTask.title }
    );

    const taskWithRelations = await this.taskRepository.findOne({
      where: { id: savedTask.id },
      relations: ['createdBy', 'assignee'],
    });

    if (!taskWithRelations) {
      throw new Error('Failed to load task after creation');
    }

    return this.toDto(taskWithRelations);
  }

  async findAll(currentUser: User): Promise<TaskDto[]> {
    // All users see all tasks in their organization
    const tasks = await this.taskRepository.find({
      where: { organizationId: currentUser.organizationId },
      relations: ['createdBy', 'assignee'],
      order: { createdAt: 'DESC' },
    });

    return tasks.map((task) => this.toDto(task));
  }

  async findOne(id: string, currentUser: User): Promise<TaskDto> {
    const task = await this.taskRepository.findOne({
      where: { id, organizationId: currentUser.organizationId },
      relations: ['createdBy', 'assignee'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.toDto(task);
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    currentUser: User
  ): Promise<TaskDto> {
    const task = await this.taskRepository.findOne({
      where: { id, organizationId: currentUser.organizationId },
      relations: ['createdBy', 'assignee'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Members can only edit their own tasks
    if (
      currentUser.role === UserRole.MEMBER &&
      task.createdById !== currentUser.id
    ) {
      throw new ForbiddenException('You can only edit your own tasks');
    }

    Object.assign(task, updateTaskDto);
    const updatedTask = await this.taskRepository.save(task);

    const taskWithRelations = await this.taskRepository.findOne({
      where: { id: updatedTask.id },
      relations: ['createdBy', 'assignee'],
    });

    if (!taskWithRelations) {
      throw new Error('Failed to load task after update');
    }

    return this.toDto(taskWithRelations);
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id, organizationId: currentUser.organizationId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Members can only delete their own tasks
    if (
      currentUser.role === UserRole.MEMBER &&
      task.createdById !== currentUser.id
    ) {
      throw new ForbiddenException('You can only delete your own tasks');
    }

    await this.taskRepository.remove(task);
  }

  private toDto(task: Task): TaskDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      completed: task.completed,
      createdById: task.createdById,
      createdByName: `${task.createdBy.firstName} ${task.createdBy.lastName}`,
      assigneeId: task.assigneeId,
      assigneeName: task.assignee
        ? `${task.assignee.firstName} ${task.assignee.lastName}`
        : undefined,
      organizationId: task.organizationId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
