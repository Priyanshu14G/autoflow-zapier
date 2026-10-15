import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduledJobDto {
  @ApiProperty({ description: 'Workflow ID to trigger on schedule', example: 'wf-uuid' })
  @IsUUID()
  workflowId!: string;

  @ApiPropertyOptional({
    description: 'Standard 5-field cron expression (minute hour dom month dow). Mutually exclusive with intervalMs.',
    example: '0 9 * * 1-5',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cronExpression?: string;

  @ApiPropertyOptional({
    description: 'Fixed interval in milliseconds. Mutually exclusive with cronExpression.',
    example: 3600000,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  intervalMs?: number;

  @ValidateIf((o: CreateScheduledJobDto) => !o.cronExpression && !o.intervalMs)
  @IsString() // will always fail if neither is set
  _scheduleRequired?: string; // Sentinel: class-validator doesn't have a cross-field OR guard natively
}

export class UpdateScheduledJobDto {
  @ApiPropertyOptional({ description: 'New cron expression' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cronExpression?: string;

  @ApiPropertyOptional({ description: 'New fixed interval in ms' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  intervalMs?: number;

  @ApiPropertyOptional({ description: 'Enable or pause the scheduled job' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
