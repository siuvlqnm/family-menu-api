import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import type { D1Database } from '@cloudflare/workers-types';

export type Database = ReturnType<typeof createDb>;

/**
 * 创建数据库连接
 * 在 Cloudflare Workers 环境中，每个请求都应该创建新的连接
 * D1 会自动管理连接池，不需要我们手动管理
 */
export function createDb(db: D1Database) {
  return drizzle(db, { 
    schema,
    // 可以在这里添加一些数据库配置
    logger: true, // 开启 SQL 日志
  });
}

// 导出所有数据库模型
export * from './schema';
