import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/decorators';
import { Role } from '../../common/auth/role.enum';
import { ApiAuthenticated, ApiNotFound, ApiVersionConflict, PageOf } from '../../common/http/swagger';
import { Coach } from './coach.entity';
import { CoachesService } from './coaches.service';
import { CreateCoachDto, ListCoachesQuery, UpdateCoachDto } from './dto/coach.dto';

@ApiTags('coaches')
@ApiAuthenticated()
@Roles(Role.AcademyAdmin, Role.Coach)
@Controller('coaches')
export class CoachesController {
  constructor(private readonly coaches: CoachesService) {}

  /** Search and list coaches */
  @Get()
  @ApiOkResponse({ type: PageOf(Coach) })
  list(@Query() query: ListCoachesQuery) {
    return this.coaches.list(query);
  }

  /** Get one coach */
  @Get(':id')
  @ApiOkResponse({ type: Coach })
  @ApiNotFound('Coach')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.coaches.get(id);
  }

  /** Register a coach (give them a login via POST /users) */
  @Roles(Role.AcademyAdmin)
  @Post()
  @ApiCreatedResponse({ type: Coach })
  create(@Body() dto: CreateCoachDto) {
    return this.coaches.create(dto);
  }

  /** Update a coach (send the `version` you last read) */
  @Roles(Role.AcademyAdmin)
  @Patch(':id')
  @ApiOkResponse({ type: Coach })
  @ApiNotFound('Coach')
  @ApiVersionConflict()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCoachDto) {
    return this.coaches.update(id, dto);
  }
}
