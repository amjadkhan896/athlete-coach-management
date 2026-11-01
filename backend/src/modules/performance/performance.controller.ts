import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/decorators';
import { Role } from '../../common/auth/role.enum';
import { ApiAuthenticated, ApiConflict, ApiNotFound, ApiUnprocessable, PageOf } from '../../common/http/swagger';
import { AssessmentListItemDto, CreateAssessmentDto, ListAssessmentsQuery } from './dto/assessment.dto';
import { PerformanceAssessment } from './performance-assessment.entity';
import { PerformanceService } from './performance.service';

@ApiTags('assessments')
@ApiAuthenticated()
@Controller('assessments')
export class PerformanceController {
  constructor(private readonly performance: PerformanceService) {}

  /** List assessments (athletes only ever get their own). Corrected originals are hidden unless includeSuperseded=true */
  @Get()
  @ApiOkResponse({ type: PageOf(AssessmentListItemDto) })
  list(@Query() query: ListAssessmentsQuery) {
    return this.performance.list(query);
  }

  /** Get one assessment (athletes: own only) */
  @Get(':id')
  @ApiOkResponse({ type: PerformanceAssessment })
  @ApiNotFound('Assessment')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.performance.get(id);
  }

  /**
   * Record an assessment, or correct one
   *
   * Assessments are never edited. To correct one, post a new assessment with `supersedesId` set to the original.
   * Coaches may only assess athletes on a team they coach on that date.
   */
  @Roles(Role.AcademyAdmin, Role.Coach)
  @Post()
  @ApiCreatedResponse({ type: PerformanceAssessment })
  @ApiConflict('The original has already been corrected')
  @ApiUnprocessable('Athlete or session not found, or the correction is for a different athlete')
  create(@Body() dto: CreateAssessmentDto) {
    return this.performance.create(dto);
  }
}
