import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsTimeZone } from '../../common/http/is-time-zone';

export class CreateAcademyDto {
  @IsString() @MinLength(2) @MaxLength(150)
  name: string;

  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'slug must be lowercase letters, numbers and dashes' })
  @MaxLength(60)
  slug: string;

  @IsOptional() @IsTimeZone()
  timezone?: string;

  @IsEmail()
  adminEmail: string;

  @IsString() @MinLength(1) @MaxLength(150)
  adminName: string;

  @IsString() @MinLength(8) @MaxLength(200)
  adminPassword: string;
}
