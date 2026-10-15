import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NodeType, WorkflowStatus } from '@libs/domain';

export class CreateWorkflowDto {
  @ApiProperty({ example: 'Customer Onboarding Pipeline' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Syncs new Stripe signups to Slack and Notion' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateWorkflowDto {
  @ApiPropertyOptional({ example: 'Customer Onboarding & Verification Pipeline' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated workflow description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class WorkflowNodeDto {
  @ApiProperty({ example: 'trigger-1' })
  @IsString()
  @IsNotEmpty()
  nodeKey!: string;

  @ApiProperty({ enum: NodeType, example: NodeType.TRIGGER })
  @IsEnum(NodeType)
  type!: NodeType;

  @ApiPropertyOptional({ example: 'webhook' })
  @IsOptional()
  @IsString()
  integration?: string | null;

  @ApiPropertyOptional({ example: 'catch_hook' })
  @IsOptional()
  @IsString()
  operation?: string | null;

  @ApiPropertyOptional({ example: { path: '/webhooks/leads' } })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

export class WorkflowEdgeDto {
  @ApiProperty({ example: 'trigger-1' })
  @IsString()
  @IsNotEmpty()
  sourceNode!: string;

  @ApiProperty({ example: 'action-slack-1' })
  @IsString()
  @IsNotEmpty()
  targetNode!: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsString()
  sourceHandle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetHandle?: string | null;
}

export class SaveWorkflowDraftDto {
  @ApiProperty({ type: [WorkflowNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes!: WorkflowNodeDto[];

  @ApiProperty({ type: [WorkflowEdgeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges!: WorkflowEdgeDto[];
}

export class WorkflowResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ enum: WorkflowStatus })
  currentStatus?: WorkflowStatus;

  @ApiPropertyOptional()
  activeVersionNumber?: number;
}

export class ExecuteWorkflowDto {
  @ApiPropertyOptional({ example: { email: 'customer@example.com', amount: 99 } })
  @IsOptional()
  @IsObject()
  triggerPayload?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Optional idempotency key preventing duplicate executions' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

