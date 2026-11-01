import { types } from 'pg';
import { DataSourceOptions } from 'typeorm';
import { AppEnv } from '../config/env';
import { ENTITIES } from './entities';
import { SnakeNamingStrategy } from './snake-naming.strategy';

// Return DATE columns as 'YYYY-MM-DD' strings. Converting them to JS Dates
// would shift calendar days by the server's timezone offset.
types.setTypeParser(types.builtins.DATE, (value) => value);

type Role = 'runtime' | 'migration';

export function buildDataSourceOptions(env: AppEnv, role: Role): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    username: role === 'runtime' ? env.DB_USER : env.DB_MIGRATION_USER,
    password: role === 'runtime' ? env.DB_PASSWORD : env.DB_MIGRATION_PASSWORD,
    ssl: env.DB_SSL ? { rejectUnauthorized: true } : false,
    entities: ENTITIES,
    namingStrategy: new SnakeNamingStrategy(),
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    migrationsTableName: 'schema_migrations',
    migrationsTransactionMode: 'each',
    // Schema changes only ever happen through reviewed migrations.
    synchronize: false,
    extra: { max: env.DB_POOL_MAX, statement_timeout: 15_000 },
  };
}
