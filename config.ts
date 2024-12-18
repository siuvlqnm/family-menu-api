import { Context } from 'hono';
import { D1Database } from '@cloudflare/workers-types';

export type Bindings = {
  JWT_SECRET: string;
  CORS_ORIGINS: string;
  DB: D1Database;
}

export const getConfig = (c: Context<{ Bindings: Bindings }>) => ({
  jwtSecret: c.env.JWT_SECRET,
  corsOrigins: c.env.CORS_ORIGINS.split(','),
  db: c.env.DB,
});
