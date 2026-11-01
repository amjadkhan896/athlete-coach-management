import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../../common/auth/role.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString() @MinLength(1) @MaxLength(150)
  fullName: string;

  @IsString() @MinLength(8) @MaxLength(200)
  password: string;

  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ description: 'Coach profile to link (role coach)' })
  @IsOptional() @IsUUID()
  coachId?: string;

  @ApiPropertyOptional({ description: 'Athlete profile to link (role athlete)' })
  @IsOptional() @IsUUID()
  athleteId?: string;
}

export class UpdateMembershipDto {
  @IsOptional() @IsEnum(Role)
  role?: Role;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
