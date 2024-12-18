import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
// import { handle } from 'hono/cloudflare-pages'
import { Bindings } from './config';
import { authRouter } from './routes/auth';
import { menuRouter } from './routes/menus';
import { recipeRouter } from './routes/recipes';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { rateLimit } from './middleware/rate-limit';
import { logger } from './middleware/logger';
import { getConfig } from './config';

// 创建应用实例
const app = new Hono<{ Bindings: Bindings }>;

// 全局中间件
app.use('*', logger());
app.use('*', rateLimit());
app.use('*', (c, next) => {
  const config = getConfig(c);
  return cors({
    origin: config.config.cors.origins,
    credentials: config.config.cors.credentials,
    allowMethods: config.config.cors.allowMethods,
    allowHeaders: config.config.cors.allowHeaders,
    exposeHeaders: config.config.cors.exposeHeaders,
  })(c, next);
});
app.use('*', errorHandler());

// 健康检查
app.get('/', (c) => {
  const config = getConfig(c);
  const startTime = Date.now() - (c.env.START_TIME || Date.now()); // 将开始时间从环境变量中获取，如果不存在则使用当前时间。
  const uptime = Math.floor(startTime / 1000); // 计算秒数。
  return c.json({
    status: 'OK',
    version: config.config.version,
    uptime: uptime,
    timestamp: new Date().toISOString(),
    environment: c.env.NODE_ENV || 'development'
  });
});

// 认证路由
app.route('/auth', authRouter);

// 需要认证的路由
const protectedRoutes = app.use('*', authMiddleware);
protectedRoutes.route('/menus', menuRouter);
protectedRoutes.route('/recipes', recipeRouter);

// 404 处理
app.notFound((c) => {
  throw new HTTPException(404, { message: 'Not Found' });
});

// 导出 Cloudflare Pages Functions 处理函数
export default app;
