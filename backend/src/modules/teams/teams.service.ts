import { Injectable } from '@nestjs/common';
import { Page } from '../../common/http/pagination.dto';
import { updateWithVersion } from '../../common/persistence/optimistic-update';
import { TenantContext } from '../../common/tenancy/tenant-context';
import { CreateTeamDto, ListTeamsQuery, UpdateTeamDto } from './dto/team.dto';
import { Team } from './entities/team.entity';

@Injectable()
export class TeamsService {
  constructor(private readonly tenant: TenantContext) {}

  private get repo() {
    return this.tenant.repo(Team);
  }

  async list(query: ListTeamsQuery): Promise<Page<Team>> {
    const [items, total] = await this.repo.findAndCount({
      where: query.status ? { status: query.status } : {},
      order: { name: 'ASC' },
      skip: query.offset,
      take: query.limit,
    });
    return { items, total, page: query.page, limit: query.limit };
  }

  get(id: string): Promise<Team> {
    return this.repo.findOneByOrFail({ id });
  }

  create(dto: CreateTeamDto): Promise<Team> {
    return this.repo.save(this.repo.create({ ...dto, academyId: this.tenant.academyId }));
  }

  update(id: string, { version, ...changes }: UpdateTeamDto): Promise<Team> {
    return updateWithVersion(this.repo, id, version, changes);
  }
}
