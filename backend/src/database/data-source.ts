import { config } from 'dotenv';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env';
import { buildDataSourceOptions } from './typeorm-options';

config({ quiet: true });

// Used by the TypeORM CLI. Connects as the owner role so it can run DDL.
export default new DataSource(buildDataSourceOptions(validateEnv(), 'migration'));
