import { Module, Global } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

/**
 * AuditModule is marked Global so that AuditLogService can be injected
 * into any module without explicit imports — identical pattern to DatabaseModule.
 */
@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
