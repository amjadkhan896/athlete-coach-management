import { CoachTeamRole } from '../entities/coach-team-assignment.entity';

export class RosterAthleteDto {
  assignmentId: string;
  /** Athlete id */
  id: string;
  firstName: string;
  lastName: string;
  /** First day on the team (YYYY-MM-DD) */
  validFrom: string;
}

export class RosterCoachDto extends RosterAthleteDto {
  role: CoachTeamRole;
}

export class RosterDto {
  teamId: string;
  /** The date the roster applies to (YYYY-MM-DD) */
  date: string;
  athletes: RosterAthleteDto[];
  coaches: RosterCoachDto[];
}

/** One period on a team, for an athlete's or coach's history. */
export class TeamHistoryEntryDto {
  /** Assignment id */
  id: string;
  teamId: string;
  teamName: string;
  /** Coaches only */
  role?: CoachTeamRole;
  validFrom: string;
  /** null while the assignment is current; otherwise the first day it no longer applied */
  validTo: string | null;
  reason: string | null;
}

/** One assignment in a team's full history. */
export class TeamAssignmentHistoryDto {
  id: string;
  kind: 'athlete' | 'coach';
  /** Athlete or coach id, depending on kind */
  personId: string;
  name: string;
  role: CoachTeamRole | null;
  validFrom: string;
  validTo: string | null;
  reason: string | null;
}
