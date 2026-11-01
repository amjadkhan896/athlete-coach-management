import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsTimeZone } from '../../../common/http/is-time-zone';

export class RegisterAcademyDto {
  /** Name of the new academy */
  @IsString() @MinLength(2) @MaxLength(150)
  academyName: string;

  /** IANA time zone; defaults to Asia/Dubai */
  @IsOptional() @IsTimeZone()
  timezone?: string;

  /** The administrator's full name */
  @IsString() @MinLength(1) @MaxLength(150)
  fullName: string;

  /** Must not already have an account (existing users sign in instead) */
  @IsEmail()
  email: string;

  @IsString() @MinLength(8) @MaxLength(200)
  password: string;
}
