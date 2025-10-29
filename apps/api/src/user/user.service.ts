import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../database/entities/user.entity';
import {
  AddUserDto,
  UserDto,
  AddUserResponseDto,
} from '@turbovets-task-manager/shared-types';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async addUser(
    addUserDto: AddUserDto,
    currentUser: User
  ): Promise<AddUserResponseDto> {
    // Only OWNER and ADMIN can add users
    if (currentUser.role === UserRole.MEMBER) {
      throw new ForbiddenException('Only owners and admins can add users');
    }

    const { email, firstName, lastName, role } = addUserDto;

    // Check if user with email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Only OWNER can create other OWNERs
    if (role === UserRole.OWNER && currentUser.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only owners can create other owners');
    }

    // Generate temporary password (in production, send email with password reset link)
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = this.userRepository.create({
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      organizationId: currentUser.organizationId,
    });

    const savedUser = await this.userRepository.save(user);

    // Load user with organization relation
    const userWithOrg = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['organization'],
    });

    if (!userWithOrg) {
      throw new Error('Failed to load user after creation');
    }

    // In production, send email with temp password
    console.log('\n=================================');
    console.log(`🔑 TEMPORARY PASSWORD for ${email}`);
    console.log(`Password: ${tempPassword}`);
    console.log('=================================\n');

    return {
      user: this.toDto(userWithOrg),
      tempPassword,
    };
  }

  async findAllInOrganization(currentUser: User): Promise<UserDto[]> {
    const users = await this.userRepository.find({
      where: { organizationId: currentUser.organizationId },
      relations: ['organization'],
      order: { createdAt: 'ASC' },
    });

    return users.map((user) => this.toDto(user));
  }

  async findOne(id: string, currentUser: User): Promise<UserDto> {
    const user = await this.userRepository.findOne({
      where: { id, organizationId: currentUser.organizationId },
      relations: ['organization'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toDto(user);
  }

  private generateTempPassword(): string {
    // Generate random 12 character password
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private toDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
    };
  }
}
