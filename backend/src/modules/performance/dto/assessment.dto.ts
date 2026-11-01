import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationQuery } from '../../../common/http/pagination.dto';
import { PerformanceAssessment } from '../performance-assessment.entity';

export class CreateAssessmentDto {
  @IsUUID()
  athleteId: string;

  @IsOptional() @IsUUID()
  sessionId?: string;

  @IsDateString({ strict: true })
  assessedOn: string;

  @IsString() @MinLength(1) @MaxLength(50)
  category: string;

  @ApiPropertyOptional({ example: { sprint_40m_s: 5.4 } })
  @IsOptional() @IsObject()
  metrics?: Record<string, number | string>;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 1 }) @Min(0) @Max(10)
  overallScore?: number;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Set when this assessment corrects an earlier one' })
  @IsOptional() @IsUUID()
  supersedesId?: string;
}

export class ListAssessmentsQuery extends PaginationQuery {
  @IsOptional() @IsUUID()
  athleteId?: string;

  @IsOptional() @IsString() @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ description: 'Include assessments that have been corrected by a later one' })
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean()
  includeSuperseded?: boolean;
}

export class AssessmentListItemDto extends PerformanceAssessment {
  /** Athlete's full name, for display in lists */
  athleteName: string | null;
}
