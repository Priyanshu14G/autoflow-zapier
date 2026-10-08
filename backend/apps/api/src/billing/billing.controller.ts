import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { UpgradeSubscriptionDto } from './dto/billing.dto';
import {
  JwtAuthGuard,
  TenantGuard,
  RequirePermissions,
  CurrentUser,
  AuthenticatedUser,
} from '@libs/common';
import { Permission } from '@libs/domain';

@ApiTags('Billing & Subscriptions')
@Controller('organizations/:orgId/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @RequirePermissions(Permission.ORG_READ)
  @ApiOperation({ summary: 'Get organization subscription tier, limits, and current usage' })
  @ApiResponse({ status: 200, description: 'Subscription entitlement status and usage summary' })
  getBillingStatus(@Param('orgId') orgId: string) {
    return this.billingService.getBillingStatus(orgId);
  }

  @Post('upgrade')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @RequirePermissions(Permission.ORG_MANAGE_BILLING)
  @ApiOperation({ summary: 'Change or upgrade organization subscription plan tier' })
  @ApiResponse({ status: 200, description: 'Subscription plan updated successfully' })
  upgradePlan(
    @Param('orgId') orgId: string,
    @Body() dto: UpgradeSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.upgradePlan(orgId, dto.plan, user.id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inbound Stripe subscription webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook received' })
  stripeWebhook(@Body() event: { type: string; data?: { object?: Record<string, unknown> } }) {
    return this.billingService.handleStripeWebhook(event);
  }
}
