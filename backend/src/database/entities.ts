import { Academy } from '../modules/academies/academy.entity';
import { AcademyMembership } from '../modules/identity/entities/academy-membership.entity';
import { User } from '../modules/identity/entities/user.entity';
import { Athlete } from '../modules/athletes/athlete.entity';
import { Coach } from '../modules/coaches/coach.entity';
import { Team } from '../modules/teams/entities/team.entity';
import { AthleteTeamAssignment } from '../modules/teams/entities/athlete-team-assignment.entity';
import { CoachTeamAssignment } from '../modules/teams/entities/coach-team-assignment.entity';
import { TrainingSession } from '../modules/training/entities/training-session.entity';
import { AttendanceRecord } from '../modules/training/entities/attendance-record.entity';
import { PerformanceAssessment } from '../modules/performance/performance-assessment.entity';

export const ENTITIES = [
  Academy,
  User,
  AcademyMembership,
  Athlete,
  Coach,
  Team,
  AthleteTeamAssignment,
  CoachTeamAssignment,
  TrainingSession,
  AttendanceRecord,
  PerformanceAssessment,
];
