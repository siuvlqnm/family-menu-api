import { Context } from 'hono';
import { D1Database } from '@cloudflare/workers-types';

// interface Config {
//   cors: {
//     origins: string[]
//     credentials: boolean
//     allowMethods: string[]
//     allowHeaders: string[]
//     exposeHeaders: string[]
//   }
//   rateLimit: {
//     windowMs: number
//     maxRequests: number
//   }
//   version: string
// }

export type Bindings = {
  JWT_SECRET: string;
  CORS_ORIGINS: string;
  NODE_ENV: string;
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  APP_VERSION: string;
  START_TIME: number;
}

export const getConfig = (c: Context<{ Bindings: Bindings }>) => ({
  jwtSecret: c.env.JWT_SECRET,
  corsOrigins: c.env.CORS_ORIGINS.split(','),
  db: c.env.DB,
  config: {
    cors: {
      origins: (c.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
    },
    rateLimit: {
      windowMs: 60 * 1000, // 1分钟
      maxRequests: 100,
    },
    version: c.env.APP_VERSION || '0.1.0',
  },
});
