import { Injectable } from '@nestjs/common';
import { Page } from '../../common/http/pagination.dto';
import { updateWithVersion } from '../../common/persistence/optimistic-update';
import { TenantContext } from '../../common/tenancy/tenant-context';
import { Athlete } from './athlete.entity';
import { CreateAthleteDto, ListAthletesQuery, UpdateAthleteDto } from './dto/athlete.dto';

@Injectable()
export class AthletesService {
  constructor(private readonly tenant: TenantContext) {}

  private get repo() {
    return this.tenant.repo(Athlete);
  }

  async list(query: ListAthletesQuery): Promise<Page<Athlete>> {
    const qb = this.repo.createQueryBuilder('a').orderBy('a.lastName').addOrderBy('a.firstName');

    if (query.search) {
      qb.andWhere(`(a.firstName || ' ' || a.lastName) ILIKE :search`, { search: `%${query.search}%` });
    }
    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.teamId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM athlete_team_assignments t
                  WHERE t.athlete_id = a.id AND t.team_id = :teamId
                    AND t.valid_from <= CURRENT_DATE AND (t.valid_to IS NULL OR t.valid_to > CURRENT_DATE))`,
        { teamId: query.teamId },
      );
    }

    const [items, total] = await qb.skip(query.offset).take(query.limit).getManyAndCount();
    return { items, total, page: query.page, limit: query.limit };
  }

  async get(id: string): Promise<Athlete> {
    await this.tenant.assertOwnAthleteIfAthlete(id);
    return this.repo.findOneByOrFail({ id });
  }

  create(dto: CreateAthleteDto): Promise<Athlete> {
    // academyId comes from the verified session, never the request body; RLS rejects any mismatch.
    return this.repo.save(this.repo.create({ ...dto, academyId: this.tenant.academyId }));
  }

  update(id: string, { version, ...changes }: UpdateAthleteDto): Promise<Athlete> {
    return updateWithVersion(this.repo, id, version, changes);
  }
}
