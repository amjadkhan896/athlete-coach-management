import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/decorators';
import { Role } from '../../common/auth/role.enum';
import { ApiAuthenticated } from '../../common/http/swagger';
import { TenantContext } from '../../common/tenancy/tenant-context';
import { Academy } from './academy.entity';
import { UpdateAcademyDto } from './academy.dto';

@ApiTags('academy')
@ApiAuthenticated()
@Controller('academy')
export class AcademiesController {
  constructor(private readonly tenant: TenantContext) {}

  /** The signed-in user's academy */
  @Get()
  @ApiOkResponse({ type: Academy })
  current(): Promise<Academy> {
    return this.tenant.repo(Academy).findOneByOrFail({ id: this.tenant.academyId });
  }

  /** Update academy settings (the timezone decides which calendar day a session belongs to) */
  @Roles(Role.AcademyAdmin)
  @Patch()
  @ApiOkResponse({ type: Academy })
  async update(@Body() dto: UpdateAcademyDto): Promise<Academy> {
    if (dto.name !== undefined || dto.timezone !== undefined) {
      await this.tenant.repo(Academy).update({ id: this.tenant.academyId }, dto);
    }
    return this.current();
  }
}
