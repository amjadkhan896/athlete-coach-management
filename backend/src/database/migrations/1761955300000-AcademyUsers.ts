import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets academy admins create logins for their coaches and athletes.
 *
 * The users table is RLS-protected and a brand-new user is not yet visible to
 * the academy (no membership exists), so creation goes through a SECURITY
 * DEFINER function. It can only ever add a membership to the academy bound in
 * the current transaction; the API restricts calling it to academy admins.
 */
export class AcademyUsers1761955300000 implements MigrationInterface {
  name = 'AcademyUsers1761955300000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE FUNCTION create_academy_user(
        p_email text, p_full_name text, p_password_hash text, p_role membership_role
      ) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
      DECLARE
        v_academy uuid := app_current_academy();
        v_user uuid;
      BEGIN
        IF v_academy IS NULL THEN
          RAISE EXCEPTION 'no academy in context' USING ERRCODE = '42501';
        END IF;

        -- An existing account (e.g. a coach working at two academies) keeps its password.
        SELECT id INTO v_user FROM users WHERE lower(email) = lower(p_email);
        IF v_user IS NULL THEN
          INSERT INTO users (email, full_name, password_hash)
          VALUES (p_email, p_full_name, p_password_hash)
          RETURNING id INTO v_user;
        END IF;

        INSERT INTO academy_memberships (academy_id, user_id, role) VALUES (v_academy, v_user, p_role);
        RETURN v_user;
      END $$;
      REVOKE ALL ON FUNCTION create_academy_user(text, text, text, membership_role) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION create_academy_user(text, text, text, membership_role) TO app_runtime;

      -- Admins can change role or deactivate; RLS WITH CHECK keeps it to their academy.
      GRANT UPDATE (role, is_active) ON academy_memberships TO app_runtime;
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      REVOKE UPDATE (role, is_active) ON academy_memberships FROM app_runtime;
      DROP FUNCTION IF EXISTS create_academy_user(text, text, text, membership_role);
    `);
  }
}
