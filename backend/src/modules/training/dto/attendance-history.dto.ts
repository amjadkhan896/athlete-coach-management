import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class AttendanceHistoryQuery {
  /** Ignored for athletes, who always get their own history. */
  @IsOptional() @IsUUID()
  athleteId?: string;
}

export class AttendanceSummaryQuery {
  @IsUUID()
  teamId: string;

  /** Inclusive, academy-local dates. Default: the last 30 days. */
  @IsOptional() @IsDateString({ strict: true })
  from?: string;

  @IsOptional() @IsDateString({ strict: true })
  to?: string;
}
