import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>
  ) {}

  async findByOrganization(organizationId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async log(
    action: string,
    entityType: string,
    entityId: string,
    userId: string,
    organizationId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.auditLogRepository.save({
      action,
      entityType,
      entityId,
      userId,
      organizationId,
      metadata: metadata || {},
    });
  }
}
