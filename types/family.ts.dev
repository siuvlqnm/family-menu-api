import { z } from 'zod';

// 成员角色
export const MemberRole = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

// 创建家庭组验证 schema
export const createFamilyGroupSchema = z.object({
  name: z.string().min(2).max(100),
});

// 更新家庭组验证 schema
export const updateFamilyGroupSchema = z.object({
  name: z.string().min(2).max(100),
});

// 添加成员验证 schema
export const addMemberSchema = z.object({
  inviteCode: z.string().min(6),
});

// 更新成员角色验证 schema
export const updateMemberRoleSchema = z.object({
  role: z.enum(Object.values(MemberRole)),
});

// 类型定义
export type CreateFamilyGroupInput = z.infer<typeof createFamilyGroupSchema>;
export type UpdateFamilyGroupInput = z.infer<typeof updateFamilyGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export interface FamilyGroup {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyMember {
  id: string;
  userId: string;
  familyGroupId: string;
  role: typeof MemberRole[keyof typeof MemberRole];
  joinedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface FamilyGroupWithMembers extends FamilyGroup {
  members: FamilyMember[];
}
