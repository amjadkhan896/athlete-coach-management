import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EntityTarget } from 'typeorm';
import { TenantContext } from '../../common/tenancy/tenant-context';
import { Athlete } from '../athletes/athlete.entity';
import { AssignAthleteDto, AssignCoachDto, EndAssignmentDto, TransferAthleteDto } from './dto/assignment.dto';
import { AthleteTeamAssignment } from './entities/athlete-team-assignment.entity';
import { CoachTeamAssignment } from './entities/coach-team-assignment.entity';
import { activeOn, TeamAccessService } from './team-access.service';

type Assignment = AthleteTeamAssignment | CoachTeamAssignment;

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly tenant: TenantContext,
    private readonly access: TeamAccessService,
  ) {}

  async assignAthlete(teamId: string, dto: AssignAthleteDto): Promise<AthleteTeamAssignment> {
    const repo = this.tenant.repo(AthleteTeamAssignment);
    // Overlapping ranges for the same athlete and team are rejected by an exclusion constraint.
    return repo.save(
      repo.create({
        academyId: this.tenant.academyId,
        teamId,
        athleteId: dto.athleteId,
        validFrom: dto.validFrom ?? (await this.access.localDate()),
        reason: dto.reason ?? null,
        createdBy: this.tenant.user.userId,
      }),
    );
  }

  async assignCoach(teamId: string, dto: AssignCoachDto): Promise<CoachTeamAssignment> {
    const repo = this.tenant.repo(CoachTeamAssignment);
    return repo.save(
      repo.create({
        academyId: this.tenant.academyId,
        teamId,
        coachId: dto.coachId,
        role: dto.role,
        validFrom: dto.validFrom ?? (await this.access.localDate()),
        reason: dto.reason ?? null,
        createdBy: this.tenant.user.userId,
      }),
    );
  }

  endAthleteAssignment(id: string, dto: EndAssignmentDto) {
    return this.end(AthleteTeamAssignment, id, dto);
  }

  endCoachAssignment(id: string, dto: EndAssignmentDto) {
    return this.end(CoachTeamAssignment, id, dto);
  }

  /**
   * Moves an athlete between teams atomically: closes the open assignment on the
   * old team and opens one on the new team with the same boundary date, so there
   * is no gap or overlap in the history.
   */
  async transferAthlete(athleteId: string, dto: TransferAthleteDto): Promise<AthleteTeamAssignment> {
    if (dto.fromTeamId === dto.toTeamId) {
      throw new UnprocessableEntityException('Source and target teams must differ');
    }
    const effectiveDate = dto.effectiveDate ?? (await this.access.localDate());

    // Serialize concurrent transfers of the same athlete.
    const athlete = await this.tenant
      .repo(Athlete)
      .createQueryBuilder('a')
      .setLock('pessimistic_write')
      .where('a.id = :athleteId', { athleteId })
      .getOne();
    if (!athlete) throw new NotFoundException('Athlete not found');

    const repo = this.tenant.repo(AthleteTeamAssignment);
    const current = await repo
      .createQueryBuilder('t')
      .where('t.athleteId = :athleteId AND t.teamId = :teamId', { athleteId, teamId: dto.fromTeamId })
      .andWhere('t.validTo IS NULL')
      .getOne();
    if (!current) {
      throw new UnprocessableEntityException('Athlete has no open assignment on the source team');
    }

    await this.end(AthleteTeamAssignment, current.id, { validTo: effectiveDate, reason: dto.reason });
    return this.assignAthlete(dto.toTeamId, {
      athleteId,
      validFrom: effectiveDate,
      reason: dto.reason ?? 'transfer',
    });
  }

  async athleteHistory(athleteId: string) {
    await this.tenant.assertOwnAthleteIfAthlete(athleteId);
    return this.tenant.manager.query(
      `SELECT a.id, a.team_id AS "teamId", t.name AS "teamName", a.valid_from AS "validFrom",
              a.valid_to AS "validTo", a.reason
         FROM athlete_team_assignments a JOIN teams t ON t.id = a.team_id
        WHERE a.athlete_id = $1
        ORDER BY a.valid_from DESC`,
      [athleteId],
    );
  }

  coachHistory(coachId: string) {
    return this.tenant.manager.query(
      `SELECT a.id, a.team_id AS "teamId", t.name AS "teamName", a.role, a.valid_from AS "validFrom",
              a.valid_to AS "validTo", a.reason
         FROM coach_team_assignments a JOIN teams t ON t.id = a.team_id
        WHERE a.coach_id = $1
        ORDER BY a.valid_from DESC`,
      [coachId],
    );
  }

  /** Every assignment the team has ever had, athletes and coaches, newest first. */
  teamHistory(teamId: string) {
    return this.tenant.manager.query(
      `SELECT * FROM (
         SELECT a.id, 'athlete' AS "kind", ath.id AS "personId", ath.first_name || ' ' || ath.last_name AS "name",
                NULL::coach_team_role AS role, a.valid_from AS "validFrom", a.valid_to AS "validTo", a.reason
           FROM athlete_team_assignments a JOIN athletes ath ON ath.id = a.athlete_id
          WHERE a.team_id = $1
         UNION ALL
         SELECT a.id, 'coach', c.id, c.first_name || ' ' || c.last_name, a.role, a.valid_from, a.valid_to, a.reason
           FROM coach_team_assignments a JOIN coaches c ON c.id = a.coach_id
          WHERE a.team_id = $1
       ) h
       ORDER BY "validFrom" DESC, "kind", "name"`,
      [teamId],
    );
  }

  async roster(teamId: string, date?: string) {
    const onDate = date ?? (await this.access.localDate());
    const [athletes, coaches] = await Promise.all([
      this.tenant.manager.query(
        `SELECT a.id AS "assignmentId", ath.id, ath.first_name AS "firstName", ath.last_name AS "lastName",
                a.valid_from AS "validFrom"
           FROM athlete_team_assignments a JOIN athletes ath ON ath.id = a.athlete_id
          WHERE a.team_id = $1 AND ${activeOn('$2', 'a.')}
          ORDER BY ath.last_name, ath.first_name`,
        [teamId, onDate],
      ),
      this.tenant.manager.query(
        `SELECT a.id AS "assignmentId", c.id, c.first_name AS "firstName", c.last_name AS "lastName",
                a.role, a.valid_from AS "validFrom"
           FROM coach_team_assignments a JOIN coaches c ON c.id = a.coach_id
          WHERE a.team_id = $1 AND ${activeOn('$2', 'a.')}
          ORDER BY a.role, c.last_name`,
        [teamId, onDate],
      ),
    ]);
    return { teamId, date: onDate, athletes, coaches };
  }

  /** Closing is the only permitted change to an assignment; a DB trigger enforces the same rule. */
  private async end<T extends Assignment>(entity: EntityTarget<T>, id: string, dto: EndAssignmentDto): Promise<T> {
    const validTo = dto.validTo ?? (await this.access.localDate());
    const repo = this.tenant.repo(entity);
    const result = await repo
      .createQueryBuilder()
      .update()
      .set({ validTo, ...(dto.reason ? { reason: dto.reason } : {}) } as never)
      .where('id = :id AND valid_to IS NULL AND valid_from < :validTo', { id, validTo })
      .returning('*')
      .execute();

    if (!result.affected) {
      const existing = await repo.findOneBy({ id } as never);
      if (!existing) throw new NotFoundException('Assignment not found');
      if (existing.validTo) throw new ConflictException('Assignment has already ended');
      throw new UnprocessableEntityException('End date must be after the start date');
    }
    return repo.findOneByOrFail({ id } as never);
  }
}
