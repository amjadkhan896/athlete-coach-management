import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/decorators';
import { Role } from '../../common/auth/role.enum';
import { ApiAuthenticated, ApiUnprocessable } from '../../common/http/swagger';
import { AttendanceService } from './attendance.service';
import { AttendanceHistoryQuery, AttendanceSummaryQuery } from './dto/attendance-history.dto';
import { AttendanceHistoryEntryDto, AttendanceSummaryDto } from './dto/responses.dto';

@ApiTags('attendance')
@ApiAuthenticated()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  /** Attendance rate per athlete for a team over a date range (default: last 30 days) */
  @Roles(Role.AcademyAdmin, Role.Coach)
  @Get('summary')
  @ApiOkResponse({ type: AttendanceSummaryDto })
  summary(@Query() query: AttendanceSummaryQuery) {
    return this.attendance.summary(query.teamId, query.from, query.to);
  }

  /** One athlete's attendance history, newest first (athletes always get their own) */
  @Get()
  @ApiOkResponse({ type: [AttendanceHistoryEntryDto] })
  @ApiUnprocessable('athleteId is required for staff')
  history(@Query() query: AttendanceHistoryQuery) {
    return this.attendance.history(query.athleteId);
  }
}
