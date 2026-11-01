import { config } from 'dotenv';

config({ quiet: true });

// The suites log in many times; the real limit (LOGIN_RATE_LIMIT, default 5/min) stays in .env.
process.env.LOGIN_RATE_LIMIT = '1000';
