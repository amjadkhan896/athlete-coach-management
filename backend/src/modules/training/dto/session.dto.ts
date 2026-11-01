import { ApiPropertyOptional, IntersectionType, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQuery } from '../../../common/http/pagination.dto';
import { VersionedDto } from '../../../common/http/version.dto';
import { SessionStatus } from '../entities/training-session.entity';

export class CreateSessionDto {
  @IsUUID()
  teamId: string;

  @IsOptional() @IsUUID()
  leadCoachId?: string;

  @IsString() @MinLength(1) @MaxLength(150)
  title: string;

  @Type(() => Date) @IsDate()
  startsAt: Date;

  @Type(() => Date) @IsDate()
  endsAt: Date;

  @IsOptional() @IsString() @MaxLength(150)
  location?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}

export class UpdateSessionDto extends IntersectionType(
  PartialType(OmitType(CreateSessionDto, ['teamId'] as const)),
  VersionedDto,
) {
  @IsOptional() @IsEnum(SessionStatus)
  status?: SessionStatus;
}

export class ListSessionsQuery extends PaginationQuery {
  @IsOptional() @IsUUID()
  teamId?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate()
  from?: Date;

  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate()
  to?: Date;

  @IsOptional() @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ description: 'Coaches: only sessions of teams they are assigned to' })
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean()
  mine?: boolean;
}

/** Repeats a session on chosen weekdays between two dates, in academy local time. */
export class CreateRecurringSessionsDto {
  @IsUUID()
  teamId: string;

  @IsOptional() @IsUUID()
  leadCoachId?: string;

  @IsString() @MinLength(1) @MaxLength(150)
  title: string;

  @IsDateString({ strict: true })
  startDate: string;

  @IsDateString({ strict: true })
  endDate: string;

  @ApiPropertyOptional({ description: '0 = Sunday … 6 = Saturday', example: [1, 3] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true })
  weekdays: number[];

  @ApiPropertyOptional({ example: '17:30', description: 'Academy local time' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:MM' })
  startTime: string;

  @IsInt() @Min(15) @Max(480)
  durationMinutes: number;

  @IsOptional() @IsString() @MaxLength(150)
  location?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}
