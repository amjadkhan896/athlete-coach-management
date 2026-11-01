import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CoachTeamRole } from '../entities/coach-team-assignment.entity';

export class AssignAthleteDto {
  @IsUUID()
  athleteId: string;

  @ApiPropertyOptional({ description: 'Defaults to today' })
  @IsOptional() @IsDateString({ strict: true })
  validFrom?: string;

  @IsOptional() @IsString() @MaxLength(200)
  reason?: string;
}

export class AssignCoachDto {
  @IsUUID()
  coachId: string;

  @IsOptional() @IsEnum(CoachTeamRole)
  role?: CoachTeamRole;

  @IsOptional() @IsDateString({ strict: true })
  validFrom?: string;

  @IsOptional() @IsString() @MaxLength(200)
  reason?: string;
}

export class EndAssignmentDto {
  @ApiPropertyOptional({ description: 'First day the assignment no longer applies. Defaults to today' })
  @IsOptional() @IsDateString({ strict: true })
  validTo?: string;

  @IsOptional() @IsString() @MaxLength(200)
  reason?: string;
}

export class TransferAthleteDto {
  @IsUUID()
  fromTeamId: string;

  @IsUUID()
  toTeamId: string;

  @ApiPropertyOptional({ description: 'Date the athlete joins the new team. Defaults to today' })
  @IsOptional() @IsDateString({ strict: true })
  effectiveDate?: string;

  @IsOptional() @IsString() @MaxLength(200)
  reason?: string;
}

export class RosterQuery {
  @ApiPropertyOptional({ description: 'Roster as of this date. Defaults to today' })
  @IsOptional() @IsDateString({ strict: true })
  date?: string;
}
