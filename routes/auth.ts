import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { loginSchema, registerSchema } from '../types/auth';
import { AuthService } from '../services/auth';
import { createDb } from '../db';
import { Bindings } from '../config';
import { authMiddleware } from '../middleware/auth';

const auth = new Hono<{ Bindings: Bindings }>();

// 用户注册
auth.post(
  '/register',
  zValidator('json', registerSchema),
  async (c) => {
    const input = c.req.valid('json');
    const db = createDb(c.env.DB);
    const authService = new AuthService(db, c);
    
    const result = await authService.register(input);
    return c.json(result, 201);
  }
);

// 用户登录
auth.post(
  '/login',
  zValidator('json', loginSchema),
  async (c) => {
    const input = c.req.valid('json');
    const db = createDb(c.env.DB);
    const authService = new AuthService(db, c);
    
    const result = await authService.login(input);
    return c.json(result);
  }
);

// 获取当前用户信息
auth.get(
  '/me',
  authMiddleware,
  async (c) => {
    const db = createDb(c.env.DB);
    const authService = new AuthService(db, c);
    const token = c.req.header('Authorization')?.split(' ')[1] as string;
    
    const user = await authService.getCurrentUser(token);
    return c.json(user);
  }
);

export { auth as authRouter };
