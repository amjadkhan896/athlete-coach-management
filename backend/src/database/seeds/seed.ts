import { config } from 'dotenv';
import 'reflect-metadata';
import { hash } from 'bcryptjs';
import { DataSource, EntityManager } from 'typeorm';
import { Role } from '../../common/auth/role.enum';
import { validateEnv } from '../../config/env';
import { Academy } from '../../modules/academies/academy.entity';
import { Athlete } from '../../modules/athletes/athlete.entity';
import { Coach } from '../../modules/coaches/coach.entity';
import { AcademyMembership } from '../../modules/identity/entities/academy-membership.entity';
import { User } from '../../modules/identity/entities/user.entity';
import { PerformanceAssessment } from '../../modules/performance/performance-assessment.entity';
import { AthleteTeamAssignment } from '../../modules/teams/entities/athlete-team-assignment.entity';
import { CoachTeamAssignment, CoachTeamRole } from '../../modules/teams/entities/coach-team-assignment.entity';
import { Team } from '../../modules/teams/entities/team.entity';
import { AttendanceRecord, AttendanceStatus } from '../../modules/training/entities/attendance-record.entity';
import { SessionStatus, TrainingSession } from '../../modules/training/entities/training-session.entity';
import { buildDataSourceOptions } from '../typeorm-options';

config({ quiet: true });

/**
 * Demo data for local development: two academies, so tenant isolation can be
 * seen in practice. Runs as the owner role (RLS does not apply). Never run in production.
 */
const FIRST = ['Omar', 'Layla', 'Yusuf', 'Mariam', 'Khalid', 'Noor', 'Hamdan', 'Aisha', 'Rashid', 'Sara', 'Zayed', 'Fatima'];
const LAST = ['Al Mansoori', 'Haddad', 'Khan', 'Rahman', 'Al Nuaimi', 'Saleh', 'Farouk', 'Qasim', 'Nasser', 'Aziz'];

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

const at = (offset: number, hourUtc: number) => {
  const d = new Date(`${day(offset)}T00:00:00Z`);
  d.setUTCHours(hourUtc);
  return d;
};

async function seedAcademy(m: EntityManager, name: string, slug: string, domain: string, passwordHash: string) {
  const academy = await m.save(Academy, { name, slug, timezone: 'Asia/Dubai' });
  const academyId = academy.id;

  const user = async (email: string, fullName: string, role: Role) => {
    const u = await m.save(User, { email, fullName, passwordHash });
    await m.save(AcademyMembership, { academyId, userId: u.id, role });
    return u;
  };

  const admin = await user(`admin@${domain}`, `${name} Admin`, Role.AcademyAdmin);
  const coachUser = await user(`coach@${domain}`, 'Head Coach', Role.Coach);
  const athleteUser = await user(`athlete@${domain}`, 'Demo Athlete', Role.Athlete);

  const teams = await m.save(Team, [
    { academyId, name: 'U14 Football', sport: 'football', ageGroup: 'U14', season: '2026/27' },
    { academyId, name: 'U16 Football', sport: 'football', ageGroup: 'U16', season: '2026/27' },
    { academyId, name: 'U18 Basketball', sport: 'basketball', ageGroup: 'U18', season: '2026/27' },
  ]);

  const coaches = await m.save(Coach, [
    { academyId, userId: coachUser.id, firstName: 'Tariq', lastName: 'Hassan', specialization: 'Football' },
    { academyId, firstName: 'Elena', lastName: 'Petrova', specialization: 'Strength & conditioning' },
    { academyId, firstName: 'Marcus', lastName: 'Reed', specialization: 'Basketball' },
  ]);

  await m.save(CoachTeamAssignment, [
    { academyId, coachId: coaches[0].id, teamId: teams[0].id, role: CoachTeamRole.Head, validFrom: day(-180), createdBy: admin.id },
    { academyId, coachId: coaches[0].id, teamId: teams[1].id, role: CoachTeamRole.Head, validFrom: day(-180), createdBy: admin.id },
    { academyId, coachId: coaches[1].id, teamId: teams[1].id, role: CoachTeamRole.Assistant, validFrom: day(-90), createdBy: admin.id },
    { academyId, coachId: coaches[2].id, teamId: teams[2].id, role: CoachTeamRole.Head, validFrom: day(-180), createdBy: admin.id },
  ]);

  const athletes: Athlete[] = [];
  for (let i = 0; i < 30; i++) {
    athletes.push(
      await m.save(Athlete, {
        academyId,
        userId: i === 0 ? athleteUser.id : null,
        firstName: FIRST[i % FIRST.length],
        lastName: LAST[(i * 7) % LAST.length],
        dateOfBirth: `${2009 + (i % 5)}-0${(i % 9) + 1}-1${i % 9}`,
        gender: i % 2 ? 'female' : 'male',
      }),
    );
  }

  const assignments: Partial<AthleteTeamAssignment>[] = athletes.map((a, i) => ({
    academyId,
    athleteId: a.id,
    teamId: teams[i % 3].id,
    validFrom: day(-150),
    createdBy: admin.id,
  }));
  // History example: the first U14 athlete moved up to U16 thirty days ago.
  assignments[0] = { ...assignments[0], validTo: day(-30) };
  assignments.push({ academyId, athleteId: athletes[0].id, teamId: teams[1].id, validFrom: day(-30), reason: 'Promoted to U16', createdBy: admin.id });
  await m.save(AthleteTeamAssignment, assignments);

  const sessions = await m.save(TrainingSession, [
    { academyId, teamId: teams[1].id, leadCoachId: coaches[0].id, title: 'Passing drills', startsAt: at(-2, 13), endsAt: at(-2, 15), location: 'Pitch 1', status: SessionStatus.Completed },
    { academyId, teamId: teams[1].id, leadCoachId: coaches[0].id, title: 'Match preparation', startsAt: at(1, 13), endsAt: at(1, 15), location: 'Pitch 1' },
    { academyId, teamId: teams[0].id, leadCoachId: coaches[0].id, title: 'Fundamentals', startsAt: at(2, 12), endsAt: at(2, 13), location: 'Pitch 2' },
    { academyId, teamId: teams[2].id, leadCoachId: coaches[2].id, title: 'Shooting practice', startsAt: at(3, 14), endsAt: at(3, 16), location: 'Court A' },
  ]);

  const u16 = [athletes[0], ...athletes.filter((_, i) => i % 3 === 1)];
  const statuses = [AttendanceStatus.Present, AttendanceStatus.Present, AttendanceStatus.Late, AttendanceStatus.Absent];
  await m.save(
    AttendanceRecord,
    u16.map((a, i) => ({ academyId, sessionId: sessions[0].id, athleteId: a.id, status: statuses[i % 4], recordedBy: coachUser.id })),
  );
  await m.save(
    PerformanceAssessment,
    u16.slice(0, 6).map((a, i) => ({
      academyId,
      athleteId: a.id,
      sessionId: sessions[0].id,
      assessedOn: day(-2),
      category: 'technical',
      metrics: { passing_accuracy_pct: 70 + i * 3, sprint_20m_s: 3.4 - i * 0.05 },
      overallScore: (6 + i * 0.5).toFixed(1),
      assessedBy: coachUser.id,
    })),
  );

  return academy;
}

async function main() {
  const env = validateEnv();
  if (env.NODE_ENV === 'production') throw new Error('Refusing to seed a production database');

  const dataSource = await new DataSource(buildDataSourceOptions(env, 'migration')).initialize();
  try {
    if ((await dataSource.getRepository(Academy).count()) > 0) {
      console.log('Database already seeded; skipping.');
      return;
    }
    const passwordHash = await hash(process.env.SEED_PASSWORD ?? 'ChangeMe123!', 12);
    await dataSource.transaction(async (m) => {
      await seedAcademy(m, 'Desert Falcons Academy', 'desert-falcons', 'falcons.test', passwordHash);
      await seedAcademy(m, 'Gulf Stars Academy', 'gulf-stars', 'gulfstars.test', passwordHash);
    });
    console.log('Seeded 2 academies. Sign in as admin@falcons.test / coach@falcons.test / athlete@falcons.test.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
