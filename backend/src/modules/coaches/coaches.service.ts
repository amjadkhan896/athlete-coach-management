import { Injectable } from '@nestjs/common';
import { Page } from '../../common/http/pagination.dto';
import { updateWithVersion } from '../../common/persistence/optimistic-update';
import { TenantContext } from '../../common/tenancy/tenant-context';
import { Coach } from './coach.entity';
import { CreateCoachDto, ListCoachesQuery, UpdateCoachDto } from './dto/coach.dto';

@Injectable()
export class CoachesService {
  constructor(private readonly tenant: TenantContext) {}

  private get repo() {
    return this.tenant.repo(Coach);
  }

  async list(query: ListCoachesQuery): Promise<Page<Coach>> {
    const qb = this.repo.createQueryBuilder('c').orderBy('c.lastName').addOrderBy('c.firstName');
    if (query.status) qb.andWhere('c.status = :status', { status: query.status });
    if (query.search) {
      qb.andWhere(`(c.firstName || ' ' || c.lastName) ILIKE :search`, { search: `%${query.search}%` });
    }
    const [items, total] = await qb.skip(query.offset).take(query.limit).getManyAndCount();
    return { items, total, page: query.page, limit: query.limit };
  }

  get(id: string): Promise<Coach> {
    return this.repo.findOneByOrFail({ id });
  }

  /** The coach profile linked to the signed-in user, if any. */
  findForCurrentUser(): Promise<Coach | null> {
    return this.repo.findOneBy({ userId: this.tenant.user.userId });
  }

  create(dto: CreateCoachDto): Promise<Coach> {
    return this.repo.save(this.repo.create({ ...dto, academyId: this.tenant.academyId }));
  }

  update(id: string, { version, ...changes }: UpdateCoachDto): Promise<Coach> {
    return updateWithVersion(this.repo, id, version, changes);
  }
}
