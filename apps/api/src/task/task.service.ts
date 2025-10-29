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

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async create(
    createTaskDto: CreateTaskDto,
    currentUser: User
  ): Promise<TaskDto> {
    const { title, description, assigneeId } = createTaskDto;

    // Validate assignee belongs to same organization
    if (assigneeId) {
      const assignee = await this.userRepository.findOne({
        where: { id: assigneeId, organizationId: currentUser.organizationId },
      });
      if (!assignee) {
        throw new ForbiddenException('Assignee must be in your organization');
      }
    }

    const task = this.taskRepository.create({
      title,
      description,
      completed: false,
      organizationId: currentUser.organizationId,
      createdById: currentUser.id,
      assigneeId: assigneeId || currentUser.id,
    });

    const savedTask = await this.taskRepository.save(task);
    return this.toDto(await this.findOneById(savedTask.id, currentUser));
  }

  async findAll(currentUser: User): Promise<TaskDto[]> {
    let tasks: Task[];

    // RBAC: OWNER and ADMIN see all org tasks, MEMBER sees only assigned tasks
    if (
      currentUser.role === UserRole.OWNER ||
      currentUser.role === UserRole.ADMIN
    ) {
      tasks = await this.taskRepository.find({
        where: { organizationId: currentUser.organizationId },
        relations: ['createdBy', 'assignee'],
        order: { createdAt: 'DESC' },
      });
    } else {
      // MEMBER: only see tasks they created or are assigned to
      tasks = await this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.createdBy', 'createdBy')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .where('task.organizationId = :orgId', {
          orgId: currentUser.organizationId,
        })
        .andWhere('(task.createdById = :userId OR task.assigneeId = :userId)', {
          userId: currentUser.id,
        })
        .orderBy('task.createdAt', 'DESC')
        .getMany();
    }

    return tasks.map((task) => this.toDto(task));
  }

  async findOne(id: string, currentUser: User): Promise<TaskDto> {
    const task = await this.findOneById(id, currentUser);
    this.checkAccess(task, currentUser);
    return this.toDto(task);
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    currentUser: User
  ): Promise<TaskDto> {
    const task = await this.findOneById(id, currentUser);
    this.checkAccess(task, currentUser);

    const { title, description, assigneeId, completed } = updateTaskDto;

    // Validate assignee if provided
    if (assigneeId !== undefined) {
      if (assigneeId === null) {
        task.assigneeId = null;
      } else {
        const assignee = await this.userRepository.findOne({
          where: { id: assigneeId, organizationId: currentUser.organizationId },
        });
        if (!assignee) {
          throw new ForbiddenException('Assignee must be in your organization');
        }
        task.assigneeId = assigneeId;
      }
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (completed !== undefined) task.completed = completed;

    await this.taskRepository.save(task);
    return this.toDto(await this.findOneById(id, currentUser));
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const task = await this.findOneById(id, currentUser);

    // RBAC: Only OWNER/ADMIN can delete any task, MEMBER can only delete their own
    if (
      currentUser.role === UserRole.MEMBER &&
      task.createdById !== currentUser.id
    ) {
      throw new ForbiddenException(
        'Members can only delete tasks they created'
      );
    }

    this.checkAccess(task, currentUser);
    await this.taskRepository.remove(task);
  }

  private async findOneById(id: string, currentUser: User): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id, organizationId: currentUser.organizationId },
      relations: ['createdBy', 'assignee', 'organization'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private checkAccess(task: Task, currentUser: User): void {
    // Ensure task belongs to user's organization (defense in depth)
    if (task.organizationId !== currentUser.organizationId) {
      throw new ForbiddenException('Access denied');
    }

    // MEMBER can only access tasks they're involved with
    if (currentUser.role === UserRole.MEMBER) {
      const isCreator = task.createdById === currentUser.id;
      const isAssignee = task.assigneeId === currentUser.id;

      if (!isCreator && !isAssignee) {
        throw new ForbiddenException('Access denied');
      }
    }
  }

  private toDto(task: Task): TaskDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description || undefined,
      completed: task.completed,
      createdById: task.createdById,
      createdByName: `${task.createdBy.firstName} ${task.createdBy.lastName}`,
      assigneeId: task.assigneeId || undefined,
      assigneeName: task.assignee
        ? `${task.assignee.firstName} ${task.assignee.lastName}`
        : undefined,
      organizationId: task.organizationId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
