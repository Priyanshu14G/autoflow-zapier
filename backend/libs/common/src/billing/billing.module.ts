import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '@libs/database';
import { UsageTrackerService } from './usage-tracker.service';
import { EntitlementService } from './entitlement.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [UsageTrackerService, EntitlementService],
  exports: [UsageTrackerService, EntitlementService],
})
export class BillingModule {}
