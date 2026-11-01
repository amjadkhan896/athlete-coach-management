import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Role } from '../../common/auth/role.enum';
import { Page } from '../../common/http/pagination.dto';
import { updateWithVersion } from '../../common/persistence/optimistic-update';
import { TenantContext } from '../../common/tenancy/tenant-context';
import { activeOn, TeamAccessService } from '../teams/team-access.service';
import { CreateRecurringSessionsDto, CreateSessionDto, ListSessionsQuery, UpdateSessionDto } from './dto/session.dto';
import { TrainingSession } from './entities/training-session.entity';

@Injectable()
export class SessionsService {
  constructor(
    private readonly tenant: TenantContext,
    private readonly access: TeamAccessService,
  ) {}

  private get repo() {
    return this.tenant.repo(TrainingSession);
  }

  async list(query: ListSessionsQuery): Promise<Page<TrainingSession>> {
    const qb = this.repo.createQueryBuilder('s').orderBy('s.startsAt', 'ASC');
    if (query.teamId) qb.andWhere('s.teamId = :teamId', { teamId: query.teamId });
    if (query.status) qb.andWhere('s.status = :status', { status: query.status });
    if (query.from) qb.andWhere('s.endsAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('s.startsAt < :to', { to: query.to });
    if (query.mine && this.tenant.user.role === Role.Coach) {
      const coachId = await this.access.currentCoachId();
      qb.andWhere(
        `s.team_id IN (SELECT team_id FROM coach_team_assignments WHERE coach_id = :coachId AND ${activeOn('CURRENT_DATE')})`,
        { coachId },
      );
    }

    const [items, total] = await qb.skip(query.offset).take(query.limit).getManyAndCount();
    return { items, total, page: query.page, limit: query.limit };
  }

  get(id: string): Promise<TrainingSession> {
    return this.repo.findOneByOrFail({ id });
  }

  async create(dto: CreateSessionDto): Promise<TrainingSession> {
    this.assertTimeRange(dto.startsAt, dto.endsAt);
    await this.access.assertCanManageTeam(dto.teamId, await this.access.localDate(dto.startsAt));

    const leadCoachId = dto.leadCoachId ?? (this.tenant.isAdmin ? null : await this.access.currentCoachId());
    // Double-booking a team is rejected by an exclusion constraint on (team, time range).
    return this.repo.save(this.repo.create({ ...dto, leadCoachId, academyId: this.tenant.academyId }));
  }

  /**
   * Creates every occurrence in one statement inside the request transaction:
   * if any occurrence clashes with an existing session, none are created (409).
   */
  async createRecurring(dto: CreateRecurringSessionsDto): Promise<TrainingSession[]> {
    const days = (Date.parse(dto.endDate) - Date.parse(dto.startDate)) / 864e5;
    if (days < 0) throw new UnprocessableEntityException('endDate must be on or after startDate');
    if (days > 366) throw new UnprocessableEntityException('A series can span at most one year');
    await this.access.assertCanManageTeam(dto.teamId, dto.startDate);

    const leadCoachId = dto.leadCoachId ?? (this.tenant.isAdmin ? null : await this.access.currentCoachId());
    const rows: { id: string }[] = await this.tenant.manager.query(
      `INSERT INTO training_sessions (academy_id, team_id, lead_coach_id, title, starts_at, ends_at, location, notes)
       SELECT a.id, $2, $3, $4,
              (d::date + $5::time) AT TIME ZONE a.timezone,
              (d::date + $5::time) AT TIME ZONE a.timezone + make_interval(mins => $6),
              $7, $8
         FROM academies a, generate_series($9::date, $10::date, interval '1 day') d
        WHERE a.id = $1 AND extract(dow FROM d)::int = ANY($11::int[])
       RETURNING id`,
      [
        this.tenant.academyId,
        dto.teamId,
        leadCoachId,
        dto.title,
        dto.startTime,
        dto.durationMinutes,
        dto.location ?? null,
        dto.notes ?? null,
        dto.startDate,
        dto.endDate,
        dto.weekdays,
      ],
    );
    if (rows.length === 0) throw new UnprocessableEntityException('No dates match the chosen weekdays');
    return this.repo.find({ where: rows.map((r) => ({ id: r.id })), order: { startsAt: 'ASC' } });
  }

  async update(id: string, { version, ...changes }: UpdateSessionDto): Promise<TrainingSession> {
    const session = await this.get(id);
    await this.access.assertCanManageTeam(session.teamId, await this.access.localDate(session.startsAt));
    this.assertTimeRange(changes.startsAt ?? session.startsAt, changes.endsAt ?? session.endsAt);
    return updateWithVersion(this.repo, id, version, changes);
  }

  private assertTimeRange(startsAt: Date, endsAt: Date) {
    if (endsAt <= startsAt) throw new UnprocessableEntityException('endsAt must be after startsAt');
  }
}
