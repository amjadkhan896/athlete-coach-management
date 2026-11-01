import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/decorators';
import { Role } from '../../common/auth/role.enum';
import { ApiAuthenticated, ApiConflict, ApiNotFound, ApiUnprocessable, ApiVersionConflict, PageOf } from '../../common/http/swagger';
import { AssignmentsService } from './assignments.service';
import { AssignAthleteDto, AssignCoachDto, RosterQuery } from './dto/assignment.dto';
import { RosterDto } from './dto/responses.dto';
import { CreateTeamDto, ListTeamsQuery, UpdateTeamDto } from './dto/team.dto';
import { AthleteTeamAssignment } from './entities/athlete-team-assignment.entity';
import { CoachTeamAssignment } from './entities/coach-team-assignment.entity';
import { Team } from './entities/team.entity';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@ApiAuthenticated()
@Roles(Role.AcademyAdmin, Role.Coach)
@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teams: TeamsService,
    private readonly assignments: AssignmentsService,
  ) {}

  /** List teams */
  @Get()
  @ApiOkResponse({ type: PageOf(Team) })
  list(@Query() query: ListTeamsQuery) {
    return this.teams.list(query);
  }

  /** Get one team */
  @Get(':id')
  @ApiOkResponse({ type: Team })
  @ApiNotFound('Team')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.teams.get(id);
  }

  /** Who was on the team (athletes and coaches) on a given date; defaults to today */
  @Get(':id/roster')
  @ApiOkResponse({ type: RosterDto })
  roster(@Param('id', ParseUUIDPipe) id: string, @Query() query: RosterQuery) {
    return this.assignments.roster(id, query.date);
  }

  /** Create a team */
  @Roles(Role.AcademyAdmin)
  @Post()
  @ApiCreatedResponse({ type: Team })
  @ApiConflict('An active team with this name already exists')
  create(@Body() dto: CreateTeamDto) {
    return this.teams.create(dto);
  }

  /** Update a team (send the `version` you last read; archive by setting status) */
  @Roles(Role.AcademyAdmin)
  @Patch(':id')
  @ApiOkResponse({ type: Team })
  @ApiNotFound('Team')
  @ApiVersionConflict()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTeamDto) {
    return this.teams.update(id, dto);
  }

  /** Add an athlete to the team from a date */
  @Roles(Role.AcademyAdmin)
  @Post(':id/athletes')
  @ApiCreatedResponse({ type: AthleteTeamAssignment })
  @ApiConflict('The athlete is already on this team for an overlapping period')
  @ApiUnprocessable('Team or athlete not found in your academy')
  assignAthlete(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignAthleteDto) {
    return this.assignments.assignAthlete(id, dto);
  }

  /** Assign a coach to the team from a date */
  @Roles(Role.AcademyAdmin)
  @Post(':id/coaches')
  @ApiCreatedResponse({ type: CoachTeamAssignment })
  @ApiConflict('The coach is already on this team for an overlapping period')
  @ApiUnprocessable('Team or coach not found in your academy')
  assignCoach(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignCoachDto) {
    return this.assignments.assignCoach(id, dto);
  }
}
