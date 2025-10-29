import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: string; // e.g., 'TASK_CREATED', 'USER_ADDED', 'TASK_DELETED'

  @Column()
  entityType: string; // e.g., 'Task', 'User', 'Organization'

  @Column()
  entityId: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.auditLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  organizationId: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
