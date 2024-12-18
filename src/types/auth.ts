import { z } from 'zod';

// 注册验证 schema
export const registerSchema = z.object({
  userName: z.string().min(3, '用户名至少3个字符').max(20, '用户名最多20个字符'),
  name: z.string().min(2, '姓名至少2个字符').max(50, '姓名最多50个字符'),
  password: z.string().min(6, '密码至少6个字符'),
});

// 登录验证 schema
export const loginSchema = z.object({
  userName: z.string(),
  password: z.string(),
});

// 类型定义
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthUser {
  id: string;
  userName?: string;
  name?: string;
  isGuest?: boolean;
}
