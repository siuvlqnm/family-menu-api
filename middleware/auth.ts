import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { jwt } from 'hono/jwt';
import type { AuthUser } from '../types/auth';

export const authMiddleware = async (c: Context, next: Next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET || 'secret',
    cookie: 'token',
  });
  return jwtMiddleware(c, next);
};

// 从请求中获取当前用户
export async function getCurrentUser(c: Context): Promise<AuthUser> {
  const payload = c.get('jwtPayload');
  if (!payload) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  return {
    id: payload.id as string,
    userName: payload.userName as string,
    name: payload.name as string,
  };
}
