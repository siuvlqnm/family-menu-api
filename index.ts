import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { handle } from 'hono/cloudflare-pages'
import { authRouter } from './routes/auth';
// import { familyRouter } from './routes/family';
import { menuRouter } from './routes/menus';
import { recipeRouter } from './routes/recipes';
// import { recipeShareRouter } from './routes/recipe-share.ts.dev';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';

// 创建应用实例
const app = new Hono();

// 全局中间件
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://family-menu.pages.dev'],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
}));
app.use('*', errorHandler());

// 健康检查
app.get('/', (c) => c.text('OK'));

// 认证路由
app.route('/auth', authRouter);

// 需要认证的路由
const protectedRoutes = app.use('*', authMiddleware);
// protectedRoutes.route('/family', familyRouter);
protectedRoutes.route('/menus', menuRouter);
protectedRoutes.route('/recipes', recipeRouter);
// protectedRoutes.route('/recipe-share', recipeShareRouter);

// 404 处理
app.notFound((c) => {
  throw new HTTPException(404, { message: 'Not Found' });
});

// 导出 Cloudflare Pages Functions 处理函数
export const onRequest = handle(app)
