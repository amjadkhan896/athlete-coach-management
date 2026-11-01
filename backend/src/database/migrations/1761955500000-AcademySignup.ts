import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Public self-service sign-up: creates an academy and its first admin.
 *
 * Unlike platform onboarding, this never reuses an existing account: the email
 * must be new (unique violation otherwise). The caller receives a session for
 * the new user, so reusing an account would hand out someone else's session.
 */
export class AcademySignup1761955500000 implements MigrationInterface {
  name = 'AcademySignup1761955500000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE FUNCTION register_academy(
        p_name text, p_slug text, p_timezone text,
        p_admin_email text, p_admin_name text, p_admin_password_hash text
      ) RETURNS TABLE (academy_id uuid, user_id uuid)
        LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
      DECLARE
        v_academy uuid;
        v_user uuid;
      BEGIN
        INSERT INTO users (email, full_name, password_hash)
        VALUES (p_admin_email, p_admin_name, p_admin_password_hash)
        RETURNING id INTO v_user;

        INSERT INTO academies (name, slug, timezone) VALUES (p_name, p_slug, p_timezone)
        RETURNING id INTO v_academy;

        INSERT INTO academy_memberships (academy_id, user_id, role) VALUES (v_academy, v_user, 'academy_admin');
        RETURN QUERY SELECT v_academy, v_user;
      END $$;
      REVOKE ALL ON FUNCTION register_academy(text, text, text, text, text, text) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION register_academy(text, text, text, text, text, text) TO app_runtime;
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP FUNCTION IF EXISTS register_academy(text, text, text, text, text, text)`);
  }
}
