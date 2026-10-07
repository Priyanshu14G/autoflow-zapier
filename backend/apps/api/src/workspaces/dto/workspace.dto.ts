import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({ description: 'Parent organization ID' })
  @IsUUID()
  @IsNotEmpty()
  organizationId!: string;

  @ApiProperty({ example: 'Marketing Workflows' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'marketing' })
  @IsOptional()
  @IsString()
  slug?: string;
}

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({ example: 'Growth Engineering' })
  @IsOptional()
  @IsString()
  name?: string;
}
