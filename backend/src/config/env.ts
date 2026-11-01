export interface AppEnv {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  CORS_ORIGIN: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  /** Runtime role: no ownership, no BYPASSRLS. */
  DB_USER: string;
  DB_PASSWORD: string;
  /** Owner role used only by migrations and seeds. */
  DB_MIGRATION_USER: string;
  DB_MIGRATION_PASSWORD: string;
  DB_POOL_MAX: number;
  DB_SSL: boolean;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  /** Secret for platform operator endpoints (academy onboarding). Unset disables them. */
  PLATFORM_ADMIN_KEY?: string;
  /** Whether anyone may create an academy from the public sign-up page. */
  ALLOW_ACADEMY_SIGNUP: boolean;
}

function required(source: NodeJS.ProcessEnv, key: string): string {
  const value = source[key];
  if (!value) throw new Error(`Missing required environment variable ${key}`);
  return value;
}

export function validateEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const env: AppEnv = {
    NODE_ENV: (source.NODE_ENV as AppEnv['NODE_ENV']) ?? 'development',
    PORT: Number(source.PORT ?? 5001),
    CORS_ORIGIN: source.CORS_ORIGIN ?? 'http://localhost:5000',
    DB_HOST: source.DB_HOST ?? 'localhost',
    DB_PORT: Number(source.DB_PORT ?? 5432),
    DB_NAME: required(source, 'DB_NAME'),
    DB_USER: required(source, 'DB_USER'),
    DB_PASSWORD: required(source, 'DB_PASSWORD'),
    DB_MIGRATION_USER: source.DB_MIGRATION_USER ?? required(source, 'DB_USER'),
    DB_MIGRATION_PASSWORD: source.DB_MIGRATION_PASSWORD ?? required(source, 'DB_PASSWORD'),
    DB_POOL_MAX: Number(source.DB_POOL_MAX ?? 20),
    DB_SSL: source.DB_SSL === 'true',
    JWT_SECRET: required(source, 'JWT_SECRET'),
    JWT_EXPIRES_IN: source.JWT_EXPIRES_IN ?? '1h',
    PLATFORM_ADMIN_KEY: source.PLATFORM_ADMIN_KEY || undefined,
    ALLOW_ACADEMY_SIGNUP: source.ALLOW_ACADEMY_SIGNUP !== 'false',
  };

  if (env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  if (env.PLATFORM_ADMIN_KEY && env.PLATFORM_ADMIN_KEY.length < 32) {
    throw new Error('PLATFORM_ADMIN_KEY must be at least 32 characters');
  }
  return env;
}
