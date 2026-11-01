import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/decorators';
import { Role } from '../../common/auth/role.enum';
import { ApiAuthenticated, ApiConflict, ApiNotFound } from '../../common/http/swagger';
import { MemberDto } from './dto/responses.dto';
import { CreateUserDto, UpdateMembershipDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiAuthenticated()
@Roles(Role.AcademyAdmin)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** List everyone with access to this academy */
  @Get()
  @ApiOkResponse({ type: [MemberDto] })
  list() {
    return this.users.list();
  }

  /**
   * Create a login
   *
   * Creates the account (or reuses an existing one with the same email) and grants it a role in this academy.
   * Optionally links it to a coach or athlete profile.
   */
  @Post()
  @ApiCreatedResponse({ type: MemberDto })
  @ApiConflict('The user already has access to this academy')
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  /** Change a user's role, or remove/restore their access (takes effect immediately) */
  @Patch(':userId')
  @ApiOkResponse({ type: MemberDto })
  @ApiNotFound('User')
  update(@Param('userId', ParseUUIDPipe) userId: string, @Body() dto: UpdateMembershipDto) {
    return this.users.update(userId, dto);
  }
}
