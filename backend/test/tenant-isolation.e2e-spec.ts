import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

/**
 * Runs against a migrated and seeded database (see README). These tests are
 * the executable proof of the security claims: academy isolation, role checks,
 * optimistic locking and append-only history.
 */
describe('Tenant isolation and integrity (e2e)', () => {
  let app: INestApplication<App>;
  let falcons: string;
  let gulf: string;
  let falconsCoach: string;

  const login = async (email: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: process.env.SEED_PASSWORD ?? 'ChangeMe123!' })
      .expect(200);
    return res.body.accessToken as string;
  };
  const get = (token: string, path: string) =>
    request(app.getHttpServer()).get(`/api${path}`).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    falcons = await login('admin@falcons.test');
    gulf = await login('admin@gulfstars.test');
    falconsCoach = await login('coach@falcons.test');
  });

  afterAll(() => app.close());

  it('lists only the caller academy athletes', async () => {
    const a = await get(falcons, '/athletes?limit=100').expect(200);
    const b = await get(gulf, '/athletes?limit=100').expect(200);
    const ids = new Set(a.body.items.map((x: { id: string }) => x.id));
    expect(a.body.total).toBeGreaterThan(0);
    expect(b.body.items.some((x: { id: string }) => ids.has(x.id))).toBe(false);
  });

  it('returns 404 for another academy record and blocks writes to it', async () => {
    const athlete = (await get(falcons, '/athletes?limit=1').expect(200)).body.items[0];
    await get(gulf, `/athletes/${athlete.id}`).expect(404);
    await request(app.getHttpServer())
      .patch(`/api/athletes/${athlete.id}`)
      .set('Authorization', `Bearer ${gulf}`)
      .send({ version: athlete.version, notes: 'cross-tenant write' })
      .expect(404);
  });

  it('rejects linking another academy athlete to a team (composite FK + RLS)', async () => {
    const athlete = (await get(falcons, '/athletes?limit=1').expect(200)).body.items[0];
    const team = (await get(gulf, '/teams?limit=1').expect(200)).body.items[0];
    await request(app.getHttpServer())
      .post(`/api/teams/${team.id}/athletes`)
      .set('Authorization', `Bearer ${gulf}`)
      .send({ athleteId: athlete.id })
      .expect(422);
  });

  it('ignores academyId supplied in a request body', async () => {
    await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', `Bearer ${falcons}`)
      .send({ name: 'Injected', sport: 'football', academyId: '00000000-0000-0000-0000-000000000000' })
      .expect(400);
  });

  it('runtime DB role sees nothing without a tenant context', async () => {
    const rows = await app.get(DataSource).query('SELECT count(*)::int AS n FROM athletes');
    expect(rows[0].n).toBe(0);
  });

  it('enforces role permissions', async () => {
    await request(app.getHttpServer())
      .post('/api/athletes')
      .set('Authorization', `Bearer ${falconsCoach}`)
      .send({ firstName: 'A', lastName: 'B', dateOfBirth: '2012-01-01' })
      .expect(403);
    await request(app.getHttpServer()).get('/api/athletes').expect(401);
  });

  it('turns a stale update into 409 Conflict', async () => {
    const team = (
      await request(app.getHttpServer())
        .post('/api/teams')
        .set('Authorization', `Bearer ${falcons}`)
        .send({ name: `Concurrency ${Date.now()}`, sport: 'football' })
        .expect(201)
    ).body;
    const patch = (season: string) =>
      request(app.getHttpServer())
        .patch(`/api/teams/${team.id}`)
        .set('Authorization', `Bearer ${falcons}`)
        .send({ version: team.version, season });

    const results = await Promise.all([patch('A'), patch('B')]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it('keeps assessment history append-only at the database level', async () => {
    await expect(
      app.get(DataSource).query('UPDATE performance_assessments SET overall_score = 0'),
    ).rejects.toThrow(/permission denied/);
  });
});
