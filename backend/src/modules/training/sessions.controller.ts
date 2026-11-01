import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/decorators';
import { Role } from '../../common/auth/role.enum';
import { ApiAuthenticated, ApiConflict, ApiNotFound, ApiUnprocessable, ApiVersionConflict, PageOf } from '../../common/http/swagger';
import { AttendanceService } from './attendance.service';
import { RecordAttendanceDto } from './dto/attendance.dto';
import { CreateRecurringSessionsDto, CreateSessionDto, ListSessionsQuery, UpdateSessionDto } from './dto/session.dto';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { TrainingSession } from './entities/training-session.entity';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@ApiAuthenticated()
@Roles(Role.AcademyAdmin, Role.Coach)
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessions: SessionsService,
    private readonly attendance: AttendanceService,
  ) {}

  /** List training sessions (filter by team, date range, status; coaches can pass mine=true) */
  @Get()
  @ApiOkResponse({ type: PageOf(TrainingSession) })
  list(@Query() query: ListSessionsQuery) {
    return this.sessions.list(query);
  }

  /** Schedule a session (coaches: only for teams they are assigned to) */
  @Post()
  @ApiCreatedResponse({ type: TrainingSession })
  @ApiConflict('The team already has a session at that time')
  @ApiUnprocessable('End time is not after start time, or the team does not exist')
  create(@Body() dto: CreateSessionDto) {
    return this.sessions.create(dto);
  }

  /**
   * Schedule a weekly series
   *
   * Creates a session on each chosen weekday between two dates, in academy local time.
   * All-or-nothing: if any occurrence clashes with an existing session, none are created.
   */
  @Post('recurring')
  @ApiCreatedResponse({ type: [TrainingSession] })
  @ApiConflict('At least one occurrence clashes with an existing session')
  @ApiUnprocessable('Invalid date range (max one year) or no dates match the weekdays')
  createRecurring(@Body() dto: CreateRecurringSessionsDto) {
    return this.sessions.createRecurring(dto);
  }

  /** Get one session */
  @Get(':id')
  @ApiOkResponse({ type: TrainingSession })
  @ApiNotFound('Session')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.get(id);
  }

  /** Edit, complete or cancel a session (send the `version` you last read) */
  @Patch(':id')
  @ApiOkResponse({ type: TrainingSession })
  @ApiNotFound('Session')
  @ApiVersionConflict()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSessionDto) {
    return this.sessions.update(id, dto);
  }

  /** Attendance recorded for a session */
  @Get(':id/attendance')
  @ApiOkResponse({ type: [AttendanceRecord] })
  listAttendance(@Param('id', ParseUUIDPipe) id: string) {
    return this.attendance.list(id);
  }

  /**
   * Record attendance (bulk, safe to repeat)
   *
   * Upserts one record per athlete. Re-sending updates the existing records instead of duplicating them.
   * Every athlete must have been on the session's team on the session date.
   */
  @Put(':id/attendance')
  @ApiOkResponse({ type: [AttendanceRecord], description: 'All attendance records for the session' })
  @ApiNotFound('Session')
  @ApiUnprocessable('Session cancelled, duplicate athletes, or athletes not on the team that day')
  recordAttendance(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordAttendanceDto) {
    return this.attendance.record(id, dto);
  }
}
