import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Role } from '../../common/auth/role.enum';
import { Page } from '../../common/http/pagination.dto';
import { TenantContext } from '../../common/tenancy/tenant-context';
import { Athlete } from '../athletes/athlete.entity';
import { TeamAccessService } from '../teams/team-access.service';
import { CreateAssessmentDto, ListAssessmentsQuery } from './dto/assessment.dto';
import { PerformanceAssessment } from './performance-assessment.entity';

@Injectable()
export class PerformanceService {
  constructor(
    private readonly tenant: TenantContext,
    private readonly access: TeamAccessService,
  ) {}

  private get repo() {
    return this.tenant.repo(PerformanceAssessment);
  }

  async list(query: ListAssessmentsQuery): Promise<Page<PerformanceAssessment & { athleteName: string | null }>> {
    let athleteId = query.athleteId;
    if (this.tenant.user.role === Role.Athlete) {
      // Athletes only ever see their own record, whatever they ask for.
      const self = await this.tenant.repo(Athlete).findOneBy({ userId: this.tenant.user.userId });
      if (!self) throw new ForbiddenException();
      athleteId = self.id;
    }

    const qb = this.repo.createQueryBuilder('p').orderBy('p.assessedOn', 'DESC').addOrderBy('p.createdAt', 'DESC');
    if (athleteId) qb.andWhere('p.athleteId = :athleteId', { athleteId });
    if (query.category) qb.andWhere('p.category = :category', { category: query.category });
    if (!query.includeSuperseded) {
      qb.andWhere('NOT EXISTS (SELECT 1 FROM performance_assessments n WHERE n.supersedes_id = p.id)');
    }

    const [items, total] = await qb.skip(query.offset).take(query.limit).getManyAndCount();
    // Include athlete names so lists can be shown without a lookup per row.
    const names: { id: string; name: string }[] = items.length
      ? await this.tenant.manager.query(
          `SELECT id, first_name || ' ' || last_name AS name FROM athletes WHERE id = ANY($1::uuid[])`,
          [[...new Set(items.map((i) => i.athleteId))]],
        )
      : [];
    const nameById = new Map(names.map((n) => [n.id, n.name]));
    return {
      items: items.map((i) => ({ ...i, athleteName: nameById.get(i.athleteId) ?? null })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async get(id: string): Promise<PerformanceAssessment> {
    const assessment = await this.repo.findOneByOrFail({ id });
    await this.tenant.assertOwnAthleteIfAthlete(assessment.athleteId);
    return assessment;
  }

  async create(dto: CreateAssessmentDto): Promise<PerformanceAssessment> {
    await this.access.assertCanAssessAthlete(dto.athleteId, dto.assessedOn);

    if (dto.supersedesId) {
      const previous = await this.repo.findOneByOrFail({ id: dto.supersedesId });
      if (previous.athleteId !== dto.athleteId) {
        throw new UnprocessableEntityException('A correction must be for the same athlete');
      }
    }

    // A unique index on supersedes_id stops two concurrent corrections of the same record.
    return this.repo.save(
      this.repo.create({
        ...dto,
        metrics: dto.metrics ?? {},
        overallScore: dto.overallScore?.toFixed(1) ?? null,
        academyId: this.tenant.academyId,
        assessedBy: this.tenant.user.userId,
      }),
    );
  }
}
