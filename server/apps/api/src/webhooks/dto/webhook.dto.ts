import {
  IsOptional,
  IsString,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiPropertyOptional({
    description: 'Workflow to attach this webhook to. If omitted, the webhook is inert until associated.',
    example: 'wf-uuid-here',
  })
  @IsOptional()
  @IsUUID()
  workflowId?: string;

  @ApiPropertyOptional({
    description: 'Optional HMAC-SHA256 signing secret. If set, all incoming requests must carry a valid X-Webhook-Signature header.',
    example: 'my-very-secret-key',
  })
  @IsOptional()
  @IsString()
  secret?: string;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({ description: 'Reassign webhook to a different workflow' })
  @IsOptional()
  @IsUUID()
  workflowId?: string;

  @ApiPropertyOptional({ description: 'Rotate the signing secret. Pass empty string to remove it.' })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ description: 'Enable or disable the webhook endpoint' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class WebhookResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() publicId!: string;
  @ApiProperty() workspaceId!: string;
  @ApiPropertyOptional() workflowId!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() hasSecret!: boolean;
  @ApiProperty() ingestUrl!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
