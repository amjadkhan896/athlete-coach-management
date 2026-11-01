import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Role } from '../../common/auth/role.enum';
import { TenantContext } from '../../common/tenancy/tenant-context';
import { TeamAccessService } from '../teams/team-access.service';
import { RecordAttendanceDto } from './dto/attendance.dto';
import { AttendanceRecord } from './entities/attendance-record.entity';
import { SessionStatus } from './entities/training-session.entity';
import { SessionsService } from './sessions.service';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly tenant: TenantContext,
    private readonly sessions: SessionsService,
    private readonly access: TeamAccessService,
  ) {}

  /** Attendance history for one athlete, newest first. Athletes may only read their own. */
  async history(athleteId?: string) {
    if (this.tenant.user.role === Role.Athlete) {
      const [self] = await this.tenant.manager.query('SELECT id FROM athletes WHERE user_id = $1', [
        this.tenant.user.userId,
      ]);
      if (!self) throw new ForbiddenException();
      athleteId = self.id;
    }
    if (!athleteId) throw new UnprocessableEntityException('athleteId is required');

    return this.tenant.manager.query(
      `SELECT r.id, r.status, r.note, r.session_id AS "sessionId", s.title, s.starts_at AS "startsAt",
              s.team_id AS "teamId", t.name AS "teamName"
         FROM attendance_records r
         JOIN training_sessions s ON s.id = r.session_id
         JOIN teams t ON t.id = s.team_id
        WHERE r.athlete_id = $1
        ORDER BY s.starts_at DESC
        LIMIT 100`,
      [athleteId],
    );
  }

  /**
   * Per-athlete attendance for a team over a date range: how many of the team's
   * (non-cancelled) sessions each current or former member attended.
   */
  async summary(teamId: string, from?: string, to?: string) {
    const end = to ?? (await this.access.localDate());
    const start = from ?? new Date(Date.parse(end) - 29 * 864e5).toISOString().slice(0, 10);
    const [{ sessions }] = await this.tenant.manager.query(
      `SELECT count(*)::int AS sessions FROM training_sessions s JOIN academies a ON a.id = s.academy_id
        WHERE s.team_id = $1 AND s.status <> 'cancelled'
          AND (s.starts_at AT TIME ZONE a.timezone)::date BETWEEN $2::date AND $3::date`,
      [teamId, start, end],
    );
    const athletes = await this.tenant.manager.query(
      `SELECT ath.id AS "athleteId", ath.first_name || ' ' || ath.last_name AS "name",
              count(*) FILTER (WHERE r.status = 'present')::int AS present,
              count(*) FILTER (WHERE r.status = 'late')::int AS late,
              count(*) FILTER (WHERE r.status = 'absent')::int AS absent,
              count(*) FILTER (WHERE r.status = 'excused')::int AS excused
         FROM attendance_records r
         JOIN training_sessions s ON s.id = r.session_id
         JOIN academies a ON a.id = s.academy_id
         JOIN athletes ath ON ath.id = r.athlete_id
        WHERE s.team_id = $1 AND s.status <> 'cancelled'
          AND (s.starts_at AT TIME ZONE a.timezone)::date BETWEEN $2::date AND $3::date
        GROUP BY ath.id
        ORDER BY ath.last_name, ath.first_name`,
      [teamId, start, end],
    );
    return {
      teamId,
      from: start,
      to: end,
      sessions,
      athletes: athletes.map((a: { present: number; late: number }) => ({
        ...a,
        attendanceRate: sessions ? Math.round(((a.present + a.late) / sessions) * 100) : null,
      })),
    };
  }

  list(sessionId: string) {
    return this.tenant.repo(AttendanceRecord).find({ where: { sessionId }, order: { createdAt: 'ASC' } });
  }

  /**
   * Idempotent bulk upsert keyed by (session, athlete). Retries and two coaches
   * submitting the same sheet converge on one row per athlete (last write wins,
   * with version incremented so readers can detect the change).
   */
  async record(sessionId: string, dto: RecordAttendanceDto): Promise<AttendanceRecord[]> {
    const session = await this.sessions.get(sessionId);
    if (session.status === SessionStatus.Cancelled) {
      throw new UnprocessableEntityException('Cannot record attendance for a cancelled session');
    }

    const athleteIds = dto.entries.map((e) => e.athleteId);
    if (new Set(athleteIds).size !== athleteIds.length) {
      throw new UnprocessableEntityException('Each athlete may appear only once');
    }

    const onDate = await this.access.localDate(session.startsAt);
    await this.access.assertCanManageTeam(session.teamId, onDate);
    await this.access.assertAthletesOnTeam(session.teamId, athleteIds, onDate);

    const recordedBy = this.tenant.user.userId;
    await this.tenant.manager.query(
      `INSERT INTO attendance_records (academy_id, session_id, athlete_id, status, note, recorded_by)
       SELECT $1, $2, e.athlete_id, e.status::attendance_status, e.note, $3
         FROM jsonb_to_recordset($4::jsonb) AS e(athlete_id uuid, status text, note text)
       ON CONFLICT (session_id, athlete_id) DO UPDATE
          SET status = EXCLUDED.status, note = EXCLUDED.note, recorded_by = EXCLUDED.recorded_by,
              updated_at = now(), version = attendance_records.version + 1`,
      [
        this.tenant.academyId,
        sessionId,
        recordedBy,
        JSON.stringify(dto.entries.map((e) => ({ athlete_id: e.athleteId, status: e.status, note: e.note ?? null }))),
      ],
    );
    return this.list(sessionId);
  }
}
