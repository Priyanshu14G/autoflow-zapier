import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '@libs/domain';

export class UpgradeSubscriptionDto {
  @ApiProperty({
    enum: SubscriptionPlan,
    example: SubscriptionPlan.PRO,
    description: 'Target subscription tier',
  })
  @IsEnum(SubscriptionPlan)
  @IsNotEmpty()
  plan!: SubscriptionPlan;
}
