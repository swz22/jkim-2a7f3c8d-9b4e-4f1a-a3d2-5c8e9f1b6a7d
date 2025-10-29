import { UserRole } from './user-role.enum';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  assigneeId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  assigneeId?: string;
  completed?: boolean;
}

export interface TaskDto {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdById: string;
  createdByName: string;
  assigneeId?: string;
  assigneeName?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface AddUserResponseDto {
  user: UserDto;
  tempPassword: string;
}
