import { IsNotEmpty, IsOptional, IsString, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConnectionDto {
  @ApiProperty({ example: 'http', description: 'Connector identifier (e.g. http, slack, email, discord)' })
  @IsString()
  @IsNotEmpty()
  integration!: string;

  @ApiProperty({ example: 'Production Webhook Key', description: 'Human-readable connection name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'API_KEY', description: 'Auth type (API_KEY, BEARER_TOKEN, BASIC, OAUTH2, CUSTOM)' })
  @IsString()
  @IsNotEmpty()
  authType!: string;

  @ApiProperty({
    example: { apiKey: 'sk_live_123456789' },
    description: 'Sensitive credentials object that will be encrypted at rest using AES-256-GCM',
  })
  @IsObject()
  @IsNotEmpty()
  credentials!: Record<string, unknown>;

  @ApiPropertyOptional({
    example: { teamId: 'T12345' },
    description: 'Non-sensitive connection metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', description: 'Token expiration timestamp' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
