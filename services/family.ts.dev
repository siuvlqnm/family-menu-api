import { and, eq, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { Database, familyGroups, familyMembers, users } from '../db';
import {
  CreateFamilyGroupInput,
  FamilyGroup,
  FamilyGroupWithMembers,
  FamilyMember,
  MemberRole,
  UpdateFamilyGroupInput,
  UpdateMemberRoleInput,
} from '../types/family';
import { AuthUser } from '../types/auth';
import { nanoid } from '../utils/id';

export class FamilyService {
  constructor(private db: Database) {}

  // 生成邀请码
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 6;
    let code = '';
    
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    
    for (let i = 0; i < length; i++) {
      code += chars[bytes[i] % chars.length];
    }
    
    return code;
  }

  // 创建家庭组
  async createFamilyGroup(input: CreateFamilyGroupInput, user: AuthUser): Promise<FamilyGroup> {
    const groupId = nanoid();
    const inviteCode = this.generateInviteCode();

    // 开始事务
    return await this.db.transaction(async (tx) => {
      // 创建家庭组
      const [group] = await tx.insert(familyGroups).values({
        id: groupId,
        name: input.name,
        inviteCode,
      }).returning();

      // 添加创建者为管理员
      await tx.insert(familyMembers).values({
        id: nanoid(),
        userId: user.id,
        familyGroupId: groupId,
        role: MemberRole.ADMIN,
      });

      return group;
    });
  }

  // 更新家庭组
  async updateFamilyGroup(
    id: string,
    input: UpdateFamilyGroupInput,
    user: AuthUser
  ): Promise<FamilyGroup> {
    // 检查权限
    const member = await this.db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.familyGroupId, id),
        eq(familyMembers.userId, user.id),
        eq(familyMembers.role, MemberRole.ADMIN)
      ),
    });

    if (!member) {
      throw new HTTPException(403, { message: 'Not authorized to update this group' });
    }

    // 更新家庭组
    const [group] = await this.db.update(familyGroups)
      .set({
        name: input.name,
        updatedAt: new Date(),
      })
      .where(eq(familyGroups.id, id))
      .returning();

    return group;
  }

  // 获取家庭组详情
  async getFamilyGroup(id: string, user: AuthUser): Promise<FamilyGroupWithMembers> {
    // 检查成员权限
    const member = await this.db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.familyGroupId, id),
        eq(familyMembers.userId, user.id)
      ),
    });

    if (!member) {
      throw new HTTPException(403, { message: 'Not authorized to view this group' });
    }

    // 获取家庭组信息
    const group = await this.db.query.familyGroups.findFirst({
      where: eq(familyGroups.id, id),
      with: {
        members: {
          with: {
            user: true,
          },
        },
      },
    });

    if (!group) {
      throw new HTTPException(404, { message: 'Family group not found' });
    }

    return group;
  }

  // 获取用户的所有家庭组
  async getUserFamilyGroups(user: AuthUser): Promise<FamilyGroup[]> {
    const groups = await this.db.query.familyGroups.findMany({
      where: eq(familyMembers.userId, user.id),
      with: {
        members: true,
      },
    });

    return groups;
  }

  // 通过邀请码加入家庭组
  async joinFamilyGroup(inviteCode: string, user: AuthUser): Promise<FamilyGroup> {
    // 查找家庭组
    const group = await this.db.query.familyGroups.findFirst({
      where: eq(familyGroups.inviteCode, inviteCode),
    });

    if (!group) {
      throw new HTTPException(404, { message: 'Invalid invite code' });
    }

    // 检查是否已经是成员
    const existingMember = await this.db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.familyGroupId, group.id),
        eq(familyMembers.userId, user.id)
      ),
    });

    if (existingMember) {
      throw new HTTPException(400, { message: 'Already a member of this group' });
    }

    // 添加成员
    await this.db.insert(familyMembers).values({
      id: nanoid(),
      userId: user.id,
      familyGroupId: group.id,
      role: MemberRole.MEMBER,
    });

    return group;
  }

  // 更新成员角色
  async updateMemberRole(
    groupId: string,
    memberId: string,
    input: UpdateMemberRoleInput,
    user: AuthUser
  ): Promise<FamilyMember> {
    // 检查是否是管理员
    const adminMember = await this.db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.familyGroupId, groupId),
        eq(familyMembers.userId, user.id),
        eq(familyMembers.role, MemberRole.ADMIN)
      ),
    });

    if (!adminMember) {
      throw new HTTPException(403, { message: 'Not authorized to update member roles' });
    }

    // 更新成员角色
    const [updatedMember] = await this.db.update(familyMembers)
      .set({
        role: input.role as typeof MemberRole[keyof typeof MemberRole],
      })
      .where(eq(familyMembers.id, memberId))
      .returning();

    if (!updatedMember) {
      throw new HTTPException(404, { message: 'Member not found' });
    }

    // 获取用户详细信息
    const memberUser = await this.db.query.users.findFirst({
      where: eq(users.id, updatedMember.userId),
    });

    if (!memberUser) {
      throw new HTTPException(404, { message: 'User not found' });
    }

    // 返回完整的 FamilyMember 对象
    return {
      ...updatedMember,
      user: {
        id: memberUser.id,
        name: memberUser.name,
        email: memberUser.email
      }
    };
  }

  // 移除成员
  async removeMember(groupId: string, memberId: string, user: AuthUser): Promise<void> {
    // 检查权限（管理员或者自己退出）
    const member = await this.db.query.familyMembers.findFirst({
      where: eq(familyMembers.id, memberId),
    });

    if (!member) {
      throw new HTTPException(404, { message: 'Member not found' });
    }

    if (
      member.userId !== user.id && // 不是自己
      !(await this.isGroupAdmin(groupId, user.id)) // 不是管理员
    ) {
      throw new HTTPException(403, { message: 'Not authorized to remove this member' });
    }

    // 如果是最后一个管理员，不能退出
    if (member.role === MemberRole.ADMIN) {
      const adminCount = await this.db
        .select({ count: sql`count(*)`})
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.familyGroupId, groupId),
            eq(familyMembers.role, MemberRole.ADMIN)
          )
        );

      if (Number(adminCount[0].count) <= 1) {
        throw new HTTPException(400, { message: 'Cannot remove the last admin' });
      }
    }

    // 移除成员
    await this.db.delete(familyMembers)
      .where(eq(familyMembers.id, memberId));
  }

  // 检查用户是否是家庭组管理员
  private async isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
    const member = await this.db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.familyGroupId, groupId),
        eq(familyMembers.userId, userId),
        eq(familyMembers.role, MemberRole.ADMIN)
      ),
    });

    return !!member;
  }
}
