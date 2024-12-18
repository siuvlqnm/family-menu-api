import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  driver: 'd1-http',
  dialect: 'sqlite',
} satisfies Config;
