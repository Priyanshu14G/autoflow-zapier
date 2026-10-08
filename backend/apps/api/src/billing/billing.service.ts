import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { EntitlementService, AuditLogService } from '@libs/common';
import { SubscriptionPlan } from '@libs/domain';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementService: EntitlementService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getBillingStatus(orgId: string) {
    return this.entitlementService.getStatus(orgId);
  }

  async upgradePlan(orgId: string, plan: SubscriptionPlan, userId?: string) {
    if (![SubscriptionPlan.FREE, SubscriptionPlan.PRO, SubscriptionPlan.BUSINESS].includes(plan)) {
      throw new BadRequestException(`Invalid subscription plan: ${plan}`);
    }

    const updated = await this.prisma.subscription.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        plan,
        status: 'active',
      },
      update: {
        plan,
        status: 'active',
      },
    });

    this.auditLogService.log({
      organizationId: orgId,
      userId: userId ?? null,
      action: 'SUBSCRIPTION_UPDATED',
      entityType: 'SUBSCRIPTION',
      entityId: updated.id,
      metadata: { plan },
    });

    this.logger.log(`Organization ${orgId} plan updated to ${plan}`);
    return this.getBillingStatus(orgId);
  }

  async handleStripeWebhook(event: { type: string; data?: { object?: Record<string, unknown> } }) {
    this.logger.log(`Received Stripe webhook event: ${event.type}`);

    const obj = event.data?.object;
    if (!obj) return { received: true };

    const customerId = obj.customer as string | undefined;
    const subscriptionId = obj.id as string | undefined;
    const status = obj.status as string | undefined;

    if (customerId) {
      const sub = await this.prisma.subscription.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (sub) {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            stripeSubscriptionId: subscriptionId ?? sub.stripeSubscriptionId,
            status: status === 'active' || status === 'trialing' ? 'active' : 'canceled',
          },
        });
      }
    }

    return { received: true };
  }
}
