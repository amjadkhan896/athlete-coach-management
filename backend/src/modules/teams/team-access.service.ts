import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { TenantContext } from '../../common/tenancy/tenant-context';
import { CoachesService } from '../coaches/coaches.service';

/** SQL predicate for an assignment active on a date; ranges are half-open [valid_from, valid_to). */
export const activeOn = (param: string, alias = '') =>
  `${alias}valid_from <= ${param}::date AND (${alias}valid_to IS NULL OR ${alias}valid_to > ${param}::date)`;

/**
 * Authorization rules that depend on team assignments. Other modules use this
 * instead of querying assignment tables directly, keeping the rule in one place.
 */
@Injectable()
export class TeamAccessService {
  constructor(
    private readonly tenant: TenantContext,
    private readonly coaches: CoachesService,
  ) {}

  /** Academy-local calendar date for a timestamp. */
  async localDate(at: Date = new Date()): Promise<string> {
    const [row] = await this.tenant.manager.query(
      `SELECT to_char(($1::timestamptz AT TIME ZONE timezone)::date, 'YYYY-MM-DD') AS d
         FROM academies WHERE id = $2`,
      [at, this.tenant.academyId],
    );
    return row.d;
  }

  /** Coach profile id for the current user; throws if a coach user has no profile. */
  async currentCoachId(): Promise<string> {
    const coach = await this.coaches.findForCurrentUser();
    if (!coach) throw new ForbiddenException('No coach profile is linked to this account');
    return coach.id;
  }

  async assertCanManageTeam(teamId: string, onDate: string): Promise<void> {
    if (this.tenant.isAdmin) return;
    const coachId = await this.currentCoachId();
    const rows = await this.tenant.manager.query(
      `SELECT 1 FROM coach_team_assignments WHERE coach_id = $1 AND team_id = $2 AND ${activeOn('$3')}`,
      [coachId, teamId, onDate],
    );
    if (rows.length === 0) throw new ForbiddenException('You are not assigned to this team');
  }

  /** A coach may assess an athlete only while both are on the same team. */
  async assertCanAssessAthlete(athleteId: string, onDate: string): Promise<void> {
    if (this.tenant.isAdmin) return;
    const coachId = await this.currentCoachId();
    const rows = await this.tenant.manager.query(
      `SELECT 1
         FROM coach_team_assignments c
         JOIN athlete_team_assignments a ON a.team_id = c.team_id
        WHERE c.coach_id = $1 AND a.athlete_id = $2
          AND ${activeOn('$3', 'c.')} AND ${activeOn('$3', 'a.')}`,
      [coachId, athleteId, onDate],
    );
    if (rows.length === 0) throw new ForbiddenException('This athlete is not on a team you coach');
  }

  async assertAthletesOnTeam(teamId: string, athleteIds: string[], onDate: string): Promise<void> {
    const rows: { athlete_id: string }[] = await this.tenant.manager.query(
      `SELECT athlete_id FROM athlete_team_assignments
        WHERE team_id = $1 AND athlete_id = ANY($2::uuid[]) AND ${activeOn('$3')}`,
      [teamId, athleteIds, onDate],
    );
    const onTeam = new Set(rows.map((r) => r.athlete_id));
    const missing = athleteIds.filter((id) => !onTeam.has(id));
    if (missing.length) {
      throw new UnprocessableEntityException({
        message: 'Some athletes were not on this team on the session date',
        athleteIds: missing,
      });
    }
  }
}
