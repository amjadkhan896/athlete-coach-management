import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Integrity rules live in the database so they hold even if application code is wrong:
 * - Every tenant table has academy_id, and child rows reference parents through
 *   composite (academy_id, id) foreign keys, so a row can never point at another
 *   academy's data.
 * - Row-level security limits every query from the runtime role to the academy
 *   in the transaction-local setting app.academy_id.
 * - Exclusion constraints prevent overlapping assignment history and double-booked teams.
 */
export class InitialSchema1761955200000 implements MigrationInterface {
  name = 'InitialSchema1761955200000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    // Runtime role used by the API. NOLOGIN: login users are granted membership per environment.
    await q.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
          CREATE ROLE app_runtime NOLOGIN NOBYPASSRLS;
        END IF;
      END $$`);

    await q.query(`
      CREATE FUNCTION app_current_academy() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT NULLIF(current_setting('app.academy_id', true), '')::uuid $$;
      CREATE FUNCTION app_current_user() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;
    `);

    await q.query(`
      CREATE TYPE membership_role   AS ENUM ('academy_admin', 'coach', 'athlete');
      CREATE TYPE athlete_status    AS ENUM ('active', 'inactive', 'archived');
      CREATE TYPE coach_status      AS ENUM ('active', 'inactive');
      CREATE TYPE team_status       AS ENUM ('active', 'archived');
      CREATE TYPE coach_team_role   AS ENUM ('head', 'assistant');
      CREATE TYPE session_status    AS ENUM ('scheduled', 'completed', 'cancelled');
      CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
    `);

    await q.query(`
      CREATE TABLE academies (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name        text NOT NULL,
        slug        text NOT NULL UNIQUE,
        timezone    text NOT NULL DEFAULT 'Asia/Dubai',
        created_at  timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE users (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email         text NOT NULL,
        password_hash text NOT NULL,
        full_name     text NOT NULL,
        is_active     boolean NOT NULL DEFAULT true,
        created_at    timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX users_email_key ON users (lower(email));

      CREATE TABLE academy_memberships (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        academy_id  uuid NOT NULL REFERENCES academies(id),
        user_id     uuid NOT NULL REFERENCES users(id),
        role        membership_role NOT NULL,
        is_active   boolean NOT NULL DEFAULT true,
        created_at  timestamptz NOT NULL DEFAULT now(),
        UNIQUE (academy_id, user_id)
      );
      CREATE INDEX academy_memberships_user_idx ON academy_memberships (user_id);

      CREATE TABLE athletes (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        academy_id    uuid NOT NULL REFERENCES academies(id),
        user_id       uuid REFERENCES users(id),
        first_name    text NOT NULL,
        last_name     text NOT NULL,
        date_of_birth date NOT NULL,
        gender        text,
        status        athlete_status NOT NULL DEFAULT 'active',
        notes         text,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now(),
        version       integer NOT NULL DEFAULT 1,
        UNIQUE (academy_id, id),
        UNIQUE (academy_id, user_id)
      );
      CREATE INDEX athletes_name_idx ON athletes (academy_id, last_name, first_name);

      CREATE TABLE coaches (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        academy_id     uuid NOT NULL REFERENCES academies(id),
        user_id        uuid REFERENCES users(id),
        first_name     text NOT NULL,
        last_name      text NOT NULL,
        specialization text,
        status         coach_status NOT NULL DEFAULT 'active',
        created_at     timestamptz NOT NULL DEFAULT now(),
        updated_at     timestamptz NOT NULL DEFAULT now(),
        version        integer NOT NULL DEFAULT 1,
        UNIQUE (academy_id, id),
        UNIQUE (academy_id, user_id)
      );

      CREATE TABLE teams (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        academy_id  uuid NOT NULL REFERENCES academies(id),
        name        text NOT NULL,
        sport       text NOT NULL,
        age_group   text,
        season      text,
        status      team_status NOT NULL DEFAULT 'active',
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now(),
        version     integer NOT NULL DEFAULT 1,
        UNIQUE (academy_id, id)
      );
      CREATE UNIQUE INDEX teams_active_name_key ON teams (academy_id, lower(name)) WHERE status = 'active';

      CREATE TABLE athlete_team_assignments (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        academy_id  uuid NOT NULL,
        athlete_id  uuid NOT NULL,
        team_id     uuid NOT NULL,
        valid_from  date NOT NULL,
        valid_to    date,
        reason      text,
        created_by  uuid NOT NULL REFERENCES users(id),
        created_at  timestamptz NOT NULL DEFAULT now(),
        FOREIGN KEY (academy_id, athlete_id) REFERENCES athletes (academy_id, id),
        FOREIGN KEY (academy_id, team_id)    REFERENCES teams (academy_id, id),
        CHECK (valid_to IS NULL OR valid_to > valid_from),
        CONSTRAINT athlete_team_no_overlap EXCLUDE USING gist (
          athlete_id WITH =, team_id WITH =, daterange(valid_from, valid_to, '[)') WITH &&
        )
      );
      CREATE INDEX athlete_team_assignments_team_idx ON athlete_team_assignments (team_id, valid_from);

      CREATE TABLE coach_team_assignments (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        academy_id  uuid NOT NULL,
        coach_id    uuid NOT NULL,
        team_id     uuid NOT NULL,
        role        coach_team_role NOT NULL DEFAULT 'assistant',
        valid_from  date NOT NULL,
        valid_to    date,
        reason      text,
        created_by  uuid NOT NULL REFERENCES users(id),
        created_at  timestamptz NOT NULL DEFAULT now(),
        FOREIGN KEY (academy_id, coach_id) REFERENCES coaches (academy_id, id),
        FOREIGN KEY (academy_id, team_id)  REFERENCES teams (academy_id, id),
        CHECK (valid_to IS NULL OR valid_to > valid_from),
        CONSTRAINT coach_team_no_overlap EXCLUDE USING gist (
          coach_id WITH =, team_id WITH =, daterange(valid_from, valid_to, '[)') WITH &&
        )
      );
      CREATE INDEX coach_team_assignments_team_idx ON coach_team_assignments (team_id, valid_from);

      CREATE TABLE training_sessions (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        academy_id     uuid NOT NULL,
        team_id        uuid NOT NULL,
        lead_coach_id  uuid,
        title          text NOT NULL,
        starts_at      timestamptz NOT NULL,
        ends_at        timestamptz NOT NULL,
        location       text,
        status         session_status NOT NULL DEFAULT 'scheduled',
        notes          text,
        created_at     timestamptz NOT NULL DEFAULT now(),
        updated_at     timestamptz NOT NULL DEFAULT now(),
        version        integer NOT NULL DEFAULT 1,
        UNIQUE (academy_id, id),
        FOREIGN KEY (academy_id, team_id)       REFERENCES teams (academy_id, id),
        FOREIGN KEY (academy_id, lead_coach_id) REFERENCES coaches (academy_id, id),
        CHECK (ends_at > starts_at),
        CONSTRAINT training_sessions_no_double_booking EXCLUDE USING gist (
          team_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&
        ) WHERE (status <> 'cancelled')
      );
      CREATE INDEX training_sessions_academy_time_idx ON training_sessions (academy_id, starts_at);

      CREATE TABLE attendance_records (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        academy_id   uuid NOT NULL,
        session_id   uuid NOT NULL,
        athlete_id   uuid NOT NULL,
        status       attendance_status NOT NULL,
        note         text,
        recorded_by  uuid NOT NULL REFERENCES users(id),
        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now(),
        version      integer NOT NULL DEFAULT 1,
        FOREIGN KEY (academy_id, session_id) REFERENCES training_sessions (academy_id, id),
        FOREIGN KEY (academy_id, athlete_id) REFERENCES athletes (academy_id, id),
        UNIQUE (session_id, athlete_id)
      );
      CREATE INDEX attendance_records_athlete_idx ON attendance_records (athlete_id);

      CREATE TABLE performance_assessments (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        academy_id     uuid NOT NULL,
        athlete_id     uuid NOT NULL,
        session_id     uuid,
        assessed_on    date NOT NULL,
        category       text NOT NULL,
        metrics        jsonb NOT NULL DEFAULT '{}'::jsonb,
        overall_score  numeric(4,1) CHECK (overall_score BETWEEN 0 AND 10),
        notes          text,
        supersedes_id  uuid UNIQUE,
        assessed_by    uuid NOT NULL REFERENCES users(id),
        created_at     timestamptz NOT NULL DEFAULT now(),
        UNIQUE (academy_id, id),
        FOREIGN KEY (academy_id, athlete_id)    REFERENCES athletes (academy_id, id),
        FOREIGN KEY (academy_id, session_id)    REFERENCES training_sessions (academy_id, id),
        FOREIGN KEY (academy_id, supersedes_id) REFERENCES performance_assessments (academy_id, id)
      );
      CREATE INDEX performance_assessments_athlete_idx ON performance_assessments (athlete_id, assessed_on DESC);
    `);

    // History rows may be closed once (valid_to set from NULL) but never rewritten.
    await q.query(`
      CREATE FUNCTION protect_assignment_history() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF OLD.valid_to IS NOT NULL
           OR NEW.valid_from <> OLD.valid_from
           OR NEW.academy_id <> OLD.academy_id
           OR NEW.team_id <> OLD.team_id THEN
          RAISE EXCEPTION 'assignment history is immutable' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
      END $$;

      CREATE TRIGGER athlete_team_assignments_history BEFORE UPDATE ON athlete_team_assignments
        FOR EACH ROW EXECUTE FUNCTION protect_assignment_history();
      CREATE TRIGGER coach_team_assignments_history BEFORE UPDATE ON coach_team_assignments
        FOR EACH ROW EXECUTE FUNCTION protect_assignment_history();
    `);

    // Pre-authentication lookup. Runs as the owner so the users table can stay RLS-protected.
    await q.query(`
      CREATE FUNCTION auth_lookup_user(p_email text)
        RETURNS TABLE (id uuid, email text, full_name text, password_hash text, is_active boolean)
        LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
        $$ SELECT id, email, full_name, password_hash, is_active FROM users WHERE lower(email) = lower(p_email) $$;
      REVOKE ALL ON FUNCTION auth_lookup_user(text) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION auth_lookup_user(text) TO app_runtime;
    `);

    // Row-level security.
    await q.query(`
      ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
      CREATE POLICY academy_isolation ON academies
        USING (id = app_current_academy()
               OR id IN (SELECT academy_id FROM academy_memberships WHERE user_id = app_current_user()));

      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      CREATE POLICY user_visibility ON users
        USING (id = app_current_user()
               OR id IN (SELECT user_id FROM academy_memberships WHERE academy_id = app_current_academy()));

      ALTER TABLE academy_memberships ENABLE ROW LEVEL SECURITY;
      CREATE POLICY membership_visibility ON academy_memberships
        USING (academy_id = app_current_academy() OR user_id = app_current_user())
        WITH CHECK (academy_id = app_current_academy());
    `);

    const tenantTables = [
      'athletes',
      'coaches',
      'teams',
      'athlete_team_assignments',
      'coach_team_assignments',
      'training_sessions',
      'attendance_records',
      'performance_assessments',
    ];
    for (const table of tenantTables) {
      await q.query(`
        ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        CREATE POLICY tenant_isolation ON ${table}
          USING (academy_id = app_current_academy())
          WITH CHECK (academy_id = app_current_academy());
      `);
    }

    // Least privilege for the runtime role.
    await q.query(`
      GRANT USAGE ON SCHEMA public TO app_runtime;
      GRANT EXECUTE ON FUNCTION app_current_academy(), app_current_user() TO app_runtime;
      GRANT SELECT ON academies, users, academy_memberships TO app_runtime;
      GRANT SELECT, INSERT, UPDATE ON athletes, coaches, teams, training_sessions, attendance_records TO app_runtime;
      -- History: insert, and close via valid_to/reason only. No deletes anywhere.
      GRANT SELECT, INSERT ON athlete_team_assignments, coach_team_assignments TO app_runtime;
      GRANT UPDATE (valid_to, reason) ON athlete_team_assignments, coach_team_assignments TO app_runtime;
      -- Assessments are append-only.
      GRANT SELECT, INSERT ON performance_assessments TO app_runtime;
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DROP TABLE IF EXISTS performance_assessments, attendance_records, training_sessions,
        coach_team_assignments, athlete_team_assignments, teams, coaches, athletes,
        academy_memberships, users, academies CASCADE;
      DROP FUNCTION IF EXISTS auth_lookup_user(text), protect_assignment_history(),
        app_current_academy(), app_current_user();
      DROP TYPE IF EXISTS membership_role, athlete_status, coach_status, team_status,
        coach_team_role, session_status, attendance_status;
    `);
  }
}
