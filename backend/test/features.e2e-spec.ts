import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/** Feature coverage beyond tenant isolation: onboarding, users, scheduling, reports, audit. */
describe('Platform features (e2e)', () => {
  let app: INestApplication<App>;
  let admin: string;
  let coach: string;
  let athlete: string;
  const password = process.env.SEED_PASSWORD ?? 'ChangeMe123!';
  const run = Date.now().toString(36);

  const http = () => request(app.getHttpServer());
  const login = async (email: string, pw = password) =>
    (await http().post('/api/auth/login').send({ email, password: pw }).expect(200)).body.accessToken as string;
  const as = (token: string) => ({
    get: (path: string) => http().get(`/api${path}`).set('Authorization', `Bearer ${token}`),
    post: (path: string, body: object) => http().post(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
    patch: (path: string, body: object) => http().patch(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    admin = await login('admin@falcons.test');
    coach = await login('coach@falcons.test');
    athlete = await login('athlete@falcons.test');
  });

  afterAll(() => app.close());

  it('onboards a new academy with its first admin (platform key required)', async () => {
    await http().get('/api/platform/academies').expect(401);
    const key = process.env.PLATFORM_ADMIN_KEY as string;
    await http()
      .post('/api/platform/academies')
      .set('X-Platform-Key', key)
      .send({ name: `Test ${run}`, slug: `test-${run}`, adminEmail: `admin-${run}@test.test`, adminName: 'T', adminPassword: 'Password123!' })
      .expect(201);
    const token = await login(`admin-${run}@test.test`, 'Password123!');
    const academy = await as(token).get('/academy').expect(200);
    expect(academy.body.slug).toBe(`test-${run}`);
    expect((await as(token).get('/athletes').expect(200)).body.total).toBe(0);
  });

  it('signs up a new academy, signs the admin in, and lets them build it', async () => {
    const email = `owner-${run}@signup.test`;
    const res = await http()
      .post('/api/auth/register')
      .send({ academyName: `Signup Academy ${run}`, fullName: 'Owner', email, password: 'Password123!' })
      .expect(201);
    expect(res.body.user.role).toBe('academy_admin');
    const token = res.body.accessToken as string;

    // Empty, isolated academy that the new admin can populate.
    expect((await as(token).get('/athletes').expect(200)).body.total).toBe(0);
    const team = (await as(token).post('/teams', { name: 'First team', sport: 'football' }).expect(201)).body;
    const coach = (await as(token).post('/coaches', { firstName: 'C', lastName: 'One' }).expect(201)).body;
    const athlete = (await as(token).post('/athletes', { firstName: 'A', lastName: 'One', dateOfBirth: '2012-05-01' }).expect(201)).body;
    await as(token).post(`/teams/${team.id}/coaches`, { coachId: coach.id, role: 'head' }).expect(201);
    await as(token).post(`/teams/${team.id}/athletes`, { athleteId: athlete.id }).expect(201);
    expect((await as(token).get(`/teams/${team.id}/roster`).expect(200)).body.athletes).toHaveLength(1);

    // Signing up again with an existing email is refused (no account reuse, no session for someone else).
    await http()
      .post('/api/auth/register')
      .send({ academyName: 'Hijack', fullName: 'X', email: 'admin@falcons.test', password: 'Password123!' })
      .expect(409);
  });

  it('lets an admin create a login that is linked to a coach profile', async () => {
    const created = await as(admin).post('/coaches', { firstName: 'New', lastName: `Coach ${run}` }).expect(201);
    const email = `coach-${run}@falcons.test`;
    await as(admin)
      .post('/users', { email, fullName: 'New Coach', password: 'Password123!', role: 'coach', coachId: created.body.id })
      .expect(201);
    const token = await login(email, 'Password123!');
    const me = await as(token).get('/auth/me').expect(200);
    expect(me.body.coachId).toBe(created.body.id);
    await as(coach).get('/users').expect(403);
  });

  it('deactivating a membership revokes access immediately', async () => {
    const email = `temp-${run}@falcons.test`;
    const user = (await as(admin).post('/users', { email, fullName: 'Temp', password: 'Password123!', role: 'coach' }).expect(201)).body;
    const token = await login(email, 'Password123!');
    await as(token).get('/auth/me').expect(200);
    await as(admin).patch(`/users/${user.userId}`, { isActive: false }).expect(200);
    await as(token).get('/auth/me').expect(401);
  });

  it('athletes can read their own profile and history, not others', async () => {
    const me = (await as(athlete).get('/auth/me').expect(200)).body;
    await as(athlete).get(`/athletes/${me.athleteId}`).expect(200);
    await as(athlete).get(`/athletes/${me.athleteId}/team-history`).expect(200);
    const other = (await as(admin).get('/athletes?limit=5').expect(200)).body.items.find((a: { id: string }) => a.id !== me.athleteId);
    await as(athlete).get(`/athletes/${other.id}`).expect(403);
    await as(athlete).get('/athletes').expect(403);
  });

  it('creates a recurring series all-or-nothing', async () => {
    const team = (await as(admin).post('/teams', { name: `Series ${run}`, sport: 'football' }).expect(201)).body;
    const series = {
      teamId: team.id,
      title: 'Training',
      startDate: '2027-01-01',
      endDate: '2027-01-31',
      weekdays: [0, 2],
      startTime: '17:00',
      durationMinutes: 60,
    };
    const created = await as(admin).post('/sessions/recurring', series).expect(201);
    expect(created.body).toHaveLength(9); // Sundays and Tuesdays in January 2027
    await as(admin).post('/sessions/recurring', series).expect(409);
    const list = await as(admin).get(`/sessions?teamId=${team.id}&limit=100`).expect(200);
    expect(list.body.total).toBe(9);
  });

  it('reports team attendance', async () => {
    const team = (await as(admin).get('/teams?limit=100').expect(200)).body.items.find((t: { name: string }) => t.name === 'U16 Football');
    const summary = await as(coach).get(`/attendance/summary?teamId=${team.id}`).expect(200);
    expect(summary.body.sessions).toBeGreaterThan(0);
    expect(summary.body.athletes[0]).toHaveProperty('attendanceRate');
  });

  it('records who changed what in the audit log', async () => {
    const team = (await as(admin).post('/teams', { name: `Audit ${run}`, sport: 'football' }).expect(201)).body;
    await as(admin).patch(`/teams/${team.id}`, { version: team.version, season: '2027' }).expect(200);
    const log = await as(admin).get(`/audit?entity=teams&entityId=${team.id}`).expect(200);
    expect(log.body.map((e: { action: string }) => e.action)).toEqual(['update', 'insert']);
    expect(log.body[0].before.season).toBeNull();
    expect(log.body[0].after.season).toBe('2027');
    await as(coach).get('/audit').expect(403);
  });

  it('changes the signed-in user password only with the current password', async () => {
    const email = `pw-${run}@falcons.test`;
    await as(admin).post('/users', { email, fullName: 'Pw', password: 'Password123!', role: 'coach' }).expect(201);
    const token = await login(email, 'Password123!');
    await as(token).post('/auth/change-password', { currentPassword: 'wrong', newPassword: 'Another123!' }).expect(400);
    await as(token).post('/auth/change-password', { currentPassword: 'Password123!', newPassword: 'Another123!' }).expect(204);
    await login(email, 'Another123!');
  });
});
