import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@libs/domain';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Automations' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'acme-corp' })
  @IsOptional()
  @IsString()
  slug?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'Acme Global Inc' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class AddOrganizationMemberDto {
  @ApiProperty({ example: 'colleague@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ enum: Role, default: Role.VIEWER })
  @IsEnum(Role)
  role!: Role;
}

export class UpdateOrganizationMemberRoleDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;
}
