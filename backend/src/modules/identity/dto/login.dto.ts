import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password: string;

  @ApiPropertyOptional({ description: 'Required when the user belongs to more than one academy' })
  @IsOptional()
  @IsUUID()
  academyId?: string;
}
