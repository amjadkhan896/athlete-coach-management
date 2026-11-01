import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/decorators';
import { Role } from '../../common/auth/role.enum';
import { ApiAuthenticated, ApiConflict, ApiNotFound, ApiUnprocessable } from '../../common/http/swagger';
import { AssignmentsService } from './assignments.service';
import { EndAssignmentDto, TransferAthleteDto } from './dto/assignment.dto';
import { TeamAssignmentHistoryDto, TeamHistoryEntryDto } from './dto/responses.dto';
import { AthleteTeamAssignment } from './entities/athlete-team-assignment.entity';
import { CoachTeamAssignment } from './entities/coach-team-assignment.entity';

@ApiTags('assignments')
@ApiAuthenticated()
@Roles(Role.AcademyAdmin)
@Controller()
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  /** Every team an athlete has been on, newest first (athletes may read their own) */
  @Roles(Role.AcademyAdmin, Role.Coach, Role.Athlete)
  @Get('athletes/:athleteId/team-history')
  @ApiOkResponse({ type: [TeamHistoryEntryDto] })
  athleteHistory(@Param('athleteId', ParseUUIDPipe) athleteId: string) {
    return this.assignments.athleteHistory(athleteId);
  }

  /** Every athlete and coach assignment a team has ever had */
  @Roles(Role.AcademyAdmin, Role.Coach)
  @Get('teams/:teamId/history')
  @ApiOkResponse({ type: [TeamAssignmentHistoryDto] })
  teamHistory(@Param('teamId', ParseUUIDPipe) teamId: string) {
    return this.assignments.teamHistory(teamId);
  }

  /** Every team a coach has been assigned to, newest first */
  @Roles(Role.AcademyAdmin, Role.Coach)
  @Get('coaches/:coachId/team-history')
  @ApiOkResponse({ type: [TeamHistoryEntryDto] })
  coachHistory(@Param('coachId', ParseUUIDPipe) coachId: string) {
    return this.assignments.coachHistory(coachId);
  }

  /**
   * Move an athlete to another team
   *
   * Closes the open assignment on the old team and opens one on the new team with the same date, in one transaction.
   */
  @Post('athletes/:athleteId/transfer')
  @ApiCreatedResponse({ type: AthleteTeamAssignment, description: 'The new assignment' })
  @ApiNotFound('Athlete')
  @ApiUnprocessable('No open assignment on the source team, or the teams are the same')
  @ApiConflict('The athlete is already on the target team for an overlapping period')
  transfer(@Param('athleteId', ParseUUIDPipe) athleteId: string, @Body() dto: TransferAthleteDto) {
    return this.assignments.transferAthlete(athleteId, dto);
  }

  /** End an athlete's team assignment (history is kept; the row gets an end date) */
  @Post('athlete-assignments/:id/end')
  @ApiCreatedResponse({ type: AthleteTeamAssignment })
  @ApiNotFound('Assignment')
  @ApiConflict('The assignment has already ended')
  @ApiUnprocessable('The end date must be after the start date')
  endAthlete(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EndAssignmentDto) {
    return this.assignments.endAthleteAssignment(id, dto);
  }

  /** End a coach's team assignment (history is kept) */
  @Post('coach-assignments/:id/end')
  @ApiCreatedResponse({ type: CoachTeamAssignment })
  @ApiNotFound('Assignment')
  @ApiConflict('The assignment has already ended')
  @ApiUnprocessable('The end date must be after the start date')
  endCoach(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EndAssignmentDto) {
    return this.assignments.endCoachAssignment(id, dto);
  }
}
