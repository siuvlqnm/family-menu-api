import { eq } from 'drizzle-orm';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { sign, verify } from 'hono/jwt';
import { Database, users } from '../db';
import { LoginInput, RegisterInput } from '../types/auth';
import { hashPassword, verifyPassword } from '../utils/auth';
import { nanoid } from '../utils/id';

interface TokenPayload {
  id: string;
  userName: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export class AuthService {
  constructor(private readonly db: Database, private readonly c: Context) {}

  private async generateToken(payload: { id: string; userName: string }): Promise<string> {
    return await sign(payload, this.c.env.JWT_SECRET || 'secret');
  }

  private async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = await verify(token, this.c.env.JWT_SECRET || 'secret') as TokenPayload;
      if (!payload.id || !payload.userName) {
        throw new Error('Invalid token payload');
      }
      return payload;
    } catch (error) {
      throw new HTTPException(401, { message: '无效的token' });
    }
  }

  // 获取当前用户信息
  async getCurrentUser(token: string) {
    const payload = await this.verifyToken(token);
    
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, payload.id),
    });

    if (!user) {
      throw new HTTPException(404, { message: '用户不存在' });
    }

    // 不返回密码
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // 用户注册
  async register(input: RegisterInput): Promise<{ token: string }> {
    // 检查用户名是否已存在
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.userName, input.userName),
    });

    if (existingUser) {
      throw new HTTPException(400, { message: '用户名已存在' });
    }

    // 创建用户
    const [user] = await this.db.insert(users).values({
      id: nanoid(),
      userName: input.userName,
      name: input.name,
      password: await hashPassword(input.password, this.c.env.JWT_SECRET),
    }).returning();

    // 生成 token
    const token = await this.generateToken({
      id: user.id,
      userName: user.userName,
    });

    return { token };
  }

  // 用户登录
  async login(input: LoginInput): Promise<{ token: string }> {
    // 查找用户
    const user = await this.db.query.users.findFirst({
      where: eq(users.userName, input.userName),
    });

    if (!user || !(await verifyPassword(input.password, user.password, this.c.env.JWT_SECRET))) {
      throw new HTTPException(401, { message: '用户名或密码错误' });
    }

    // 生成 token
    const token = await this.generateToken({
      id: user.id,
      userName: user.userName,
    });

    return { token };
  }
}
