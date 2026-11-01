import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsTimeZone } from '../../common/http/is-time-zone';

export class UpdateAcademyDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150)
  name?: string;

  /** IANA time zone, e.g. Asia/Dubai */
  @IsOptional() @IsTimeZone()
  timezone?: string;
}
