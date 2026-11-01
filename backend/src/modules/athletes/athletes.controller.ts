import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/decorators';
import { Role } from '../../common/auth/role.enum';
import { ApiAuthenticated, ApiNotFound, ApiVersionConflict, PageOf } from '../../common/http/swagger';
import { Athlete } from './athlete.entity';
import { AthletesService } from './athletes.service';
import { CreateAthleteDto, ListAthletesQuery, UpdateAthleteDto } from './dto/athlete.dto';

@ApiTags('athletes')
@ApiAuthenticated()
@Roles(Role.AcademyAdmin, Role.Coach)
@Controller('athletes')
export class AthletesController {
  constructor(private readonly athletes: AthletesService) {}

  /** Search and list athletes (filter by name, status or current team) */
  @Get()
  @ApiOkResponse({ type: PageOf(Athlete) })
  list(@Query() query: ListAthletesQuery) {
    return this.athletes.list(query);
  }

  /** Get one athlete (athletes may only read their own profile) */
  @Roles(Role.AcademyAdmin, Role.Coach, Role.Athlete)
  @Get(':id')
  @ApiOkResponse({ type: Athlete })
  @ApiNotFound('Athlete')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.athletes.get(id);
  }

  /** Register an athlete */
  @Roles(Role.AcademyAdmin)
  @Post()
  @ApiCreatedResponse({ type: Athlete })
  create(@Body() dto: CreateAthleteDto) {
    return this.athletes.create(dto);
  }

  /** Update an athlete (send the `version` you last read; archive by setting status) */
  @Roles(Role.AcademyAdmin)
  @Patch(':id')
  @ApiOkResponse({ type: Athlete })
  @ApiNotFound('Athlete')
  @ApiVersionConflict()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAthleteDto) {
    return this.athletes.update(id, dto);
  }
}
