import { Module } from '@nestjs/common';
import { DatabaseModule } from '@libs/database';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingApiModule {}
