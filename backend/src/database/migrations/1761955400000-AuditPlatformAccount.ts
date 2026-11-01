import { MigrationInterface, QueryRunner } from 'typeorm';

const AUDITED = [
  'academy_memberships',
  'athletes',
  'coaches',
  'teams',
  'athlete_team_assignments',
  'coach_team_assignments',
  'training_sessions',
  'attendance_records',
  'performance_assessments',
];

/**
 * - Audit log: every insert/update on tenant tables is recorded by a trigger with
 *   who (app.user_id), when, and before/after values. The API can read it but
 *   cannot write or alter it.
 * - Academy settings: admins may update their own academy's name and timezone.
 * - Password change for the signed-in user.
 * - Platform onboarding: create an academy with its first admin.
 */
export class AuditPlatformAccount1761955400000 implements MigrationInterface {
  name = 'AuditPlatformAccount1761955400000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE audit_log (
        id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        academy_id  uuid NOT NULL,
        table_name  text NOT NULL,
        row_id      uuid NOT NULL,
        action      text NOT NULL CHECK (action IN ('insert', 'update')),
        changed_by  uuid,
        changed_at  timestamptz NOT NULL DEFAULT now(),
        old_data    jsonb,
        new_data    jsonb
      );
      CREATE INDEX audit_log_row_idx ON audit_log (academy_id, table_name, row_id, changed_at DESC);
      CREATE INDEX audit_log_recent_idx ON audit_log (academy_id, changed_at DESC);

      ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
      CREATE POLICY tenant_isolation ON audit_log USING (academy_id = app_current_academy());
      GRANT SELECT ON audit_log TO app_runtime;

      -- SECURITY DEFINER: the runtime role has no INSERT on audit_log, so entries cannot be forged.
      CREATE FUNCTION audit_row() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
      BEGIN
        IF TG_OP = 'UPDATE' AND to_jsonb(OLD) = to_jsonb(NEW) THEN
          RETURN NULL;
        END IF;
        INSERT INTO audit_log (academy_id, table_name, row_id, action, changed_by, old_data, new_data)
        VALUES (NEW.academy_id, TG_TABLE_NAME, NEW.id, lower(TG_OP), app_current_user(),
                CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) END, to_jsonb(NEW));
        RETURN NULL;
      END $$;
    `);
    for (const table of AUDITED) {
      await q.query(
        `CREATE TRIGGER ${table}_audit AFTER INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION audit_row()`,
      );
    }

    // Academy settings: SELECT stays as before; UPDATE only for the academy in context.
    await q.query(`
      DROP POLICY academy_isolation ON academies;
      CREATE POLICY academy_select ON academies FOR SELECT
        USING (id = app_current_academy()
               OR id IN (SELECT academy_id FROM academy_memberships WHERE user_id = app_current_user()));
      CREATE POLICY academy_update ON academies FOR UPDATE
        USING (id = app_current_academy()) WITH CHECK (id = app_current_academy());
      GRANT UPDATE (name, timezone) ON academies TO app_runtime;
    `);

    // The API verifies the current password first; this only ever touches the signed-in user.
    await q.query(`
      CREATE FUNCTION set_own_password(p_password_hash text) RETURNS void
        LANGUAGE sql SECURITY DEFINER SET search_path = public AS
        $$ UPDATE users SET password_hash = p_password_hash WHERE id = app_current_user() $$;
      REVOKE ALL ON FUNCTION set_own_password(text) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION set_own_password(text) TO app_runtime;
    `);

    // Platform operator functions (the API protects them with PLATFORM_ADMIN_KEY).
    await q.query(`
      CREATE FUNCTION platform_create_academy(
        p_name text, p_slug text, p_timezone text,
        p_admin_email text, p_admin_name text, p_admin_password_hash text
      ) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
      DECLARE
        v_academy uuid;
        v_user uuid;
      BEGIN
        INSERT INTO academies (name, slug, timezone) VALUES (p_name, p_slug, p_timezone) RETURNING id INTO v_academy;
        SELECT id INTO v_user FROM users WHERE lower(email) = lower(p_admin_email);
        IF v_user IS NULL THEN
          INSERT INTO users (email, full_name, password_hash)
          VALUES (p_admin_email, p_admin_name, p_admin_password_hash) RETURNING id INTO v_user;
        END IF;
        INSERT INTO academy_memberships (academy_id, user_id, role) VALUES (v_academy, v_user, 'academy_admin');
        RETURN v_academy;
      END $$;

      CREATE FUNCTION platform_list_academies()
        RETURNS TABLE (id uuid, name text, slug text, timezone text, created_at timestamptz,
                       athletes bigint, coaches bigint, users bigint)
        LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
        SELECT a.id, a.name, a.slug, a.timezone, a.created_at,
               (SELECT count(*) FROM athletes x WHERE x.academy_id = a.id),
               (SELECT count(*) FROM coaches x WHERE x.academy_id = a.id),
               (SELECT count(*) FROM academy_memberships x WHERE x.academy_id = a.id AND x.is_active)
          FROM academies a ORDER BY a.created_at
      $$;

      REVOKE ALL ON FUNCTION platform_create_academy(text, text, text, text, text, text) FROM PUBLIC;
      REVOKE ALL ON FUNCTION platform_list_academies() FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION platform_create_academy(text, text, text, text, text, text) TO app_runtime;
      GRANT EXECUTE ON FUNCTION platform_list_academies() TO app_runtime;
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const table of AUDITED) await q.query(`DROP TRIGGER IF EXISTS ${table}_audit ON ${table}`);
    await q.query(`
      DROP FUNCTION IF EXISTS audit_row(), set_own_password(text),
        platform_create_academy(text, text, text, text, text, text), platform_list_academies();
      DROP TABLE IF EXISTS audit_log;
      REVOKE UPDATE (name, timezone) ON academies FROM app_runtime;
      DROP POLICY IF EXISTS academy_update ON academies;
      DROP POLICY IF EXISTS academy_select ON academies;
      CREATE POLICY academy_isolation ON academies
        USING (id = app_current_academy()
               OR id IN (SELECT academy_id FROM academy_memberships WHERE user_id = app_current_user()));
    `);
  }
}
