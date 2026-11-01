import { validateEnv } from './env';

const base = {
  DB_NAME: 'acm',
  DB_USER: 'acm_app',
  DB_PASSWORD: 'secret',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('applies defaults and falls back to the runtime role for migrations', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(5001);
    expect(env.DB_MIGRATION_USER).toBe('acm_app');
    expect(env.DB_SSL).toBe(false);
  });

  it('rejects a missing database name', () => {
    expect(() => validateEnv({ ...base, DB_NAME: undefined })).toThrow(/DB_NAME/);
  });

  it('rejects a short JWT secret', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow(/32 characters/);
  });

  it('rejects a short platform key but allows it to be unset', () => {
    expect(validateEnv(base).PLATFORM_ADMIN_KEY).toBeUndefined();
    expect(() => validateEnv({ ...base, PLATFORM_ADMIN_KEY: 'short' })).toThrow(/PLATFORM_ADMIN_KEY/);
  });
});
