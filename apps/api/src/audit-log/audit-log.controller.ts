import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../database/entities/user.entity';
import { AuditLog } from '../database/entities/audit-log.entity';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getAuditLogs(@CurrentUser() user: User): Promise<AuditLog[]> {
    return this.auditLogService.findByOrganization(user.organizationId);
  }
}
