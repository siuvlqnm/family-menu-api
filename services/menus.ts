import { and, between, eq, isNull, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { Database, familyMembers, menuItems, menuShares, menus, recipes } from '../db';
import {
  AddMenuItemInput,
  CreateMenuInput,
  CreateMenuShareInput,
  Menu,
  MenuItem,
  MenuQueryInput,
  MenuShare,
  MenuStatus,
  MenuWithItems,
  UpdateMenuInput,
  UpdateMenuItemInput,
} from '../types/menu';
import { AuthUser } from '../types/auth';
import { nanoid } from '../utils/id';
import { string } from 'zod';

// 数据库记录类型
export type DbMenuItem = typeof menuItems.$inferSelect;
export type NewDbMenuItem = typeof menuItems.$inferInsert;

export class MenuService {
  constructor(private db: Database) {}

  // 检查用户是否是家庭组成员
  private async checkFamilyMembership(familyGroupId: string | null | undefined, user: AuthUser): Promise<void> {
    // 如果是访客，跳过检查
    if (user.isGuest) {
      return;
    }

    // 如果没有家庭组ID，说明是个人菜单，直接返回
    if (!familyGroupId) {
      return;
    }

    const member = await this.db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.familyGroupId, familyGroupId),
        eq(familyMembers.userId, user.id)
      ),
    });

    if (!member) {
      throw new HTTPException(403, { message: 'Not a member of this family group' });
    }
  }

  // 创建菜单
  async createMenu(input: CreateMenuInput, user: AuthUser): Promise<Menu> {
    // 如果指定了家庭组，检查成员权限
    if (input.familyGroupId) {
      await this.checkFamilyMembership(input.familyGroupId, user);
    }

    // 验证日期
    if (input.startDate > input.endDate) {
      throw new HTTPException(400, { message: 'Start date must be before end date' });
    }

    // 创建菜单
    const menuData = {
      id: nanoid(),
      name: input.name,
      description: input.description || null,
      type: input.type,
      status: 'PUBLISHED',
      tags: input.tags || [],
      startDate: input.startDate,
      endDate: input.endDate,
      familyGroupId: input.familyGroupId || null,
      createdBy: user.id,
    } satisfies Omit<Menu, 'createdAt' | 'updatedAt'>;

    const [menu] = await this.db.insert(menus).values(menuData).returning();

    return menu;
  }

  // 更新菜单
  async updateMenu(id: string, input: UpdateMenuInput, user: AuthUser): Promise<Menu> {
    // 获取菜单
    const menu = await this.db.query.menus.findFirst({
      where: eq(menus.id, id),
    });

    if (!menu) {
      throw new HTTPException(404, { message: 'Menu not found' });
    }

    // 如果是家庭组菜单，检查权限
    if (menu.familyGroupId) {
      await this.checkFamilyMembership(menu.familyGroupId, user);
    } else if (menu.createdBy !== user.id) {
      // 如果是个人菜单，只有创建者可以更新
      throw new HTTPException(403, { message: 'Not authorized to update this menu' });
    }

    // 如果要更改家庭组，检查新家庭组的权限
    if (input.familyGroupId && input.familyGroupId !== menu.familyGroupId) {
      await this.checkFamilyMembership(input.familyGroupId, user);
    }

    // 验证日期
    if (input.startDate && input.endDate && input.startDate > input.endDate) {
      throw new HTTPException(400, { message: 'Start date must be before end date' });
    }

    // 更新菜单
    const [updatedMenu] = await this.db.update(menus)
      .set({
        ...input,
        // updatedAt: new Date()
      })
      .where(eq(menus.id, id))
      .returning();

    return updatedMenu;
  }

  // 获取菜单详情
  async getMenu(id: string, user: AuthUser): Promise<MenuWithItems> {
    // 获取菜单
    const menu = await this.db.query.menus.findFirst({
      where: eq(menus.id, id),
      with: {
        items: {
          with: {
            recipe: true
          }
        }
      }
    });

    if (!menu) {
      throw new HTTPException(404, { message: 'Menu not found' });
    }

    // 如果是家庭组菜单，检查权限
    if (menu.familyGroupId) {
      await this.checkFamilyMembership(menu.familyGroupId, user);
    } else if (menu.createdBy !== user.id) {
      // 如果是个人菜单，只有创建者可以查看
      throw new HTTPException(403, { message: 'Not authorized to view this menu' });
    }

    return menu as MenuWithItems;
  }

  // 查询菜单列表
  async getMenus(query: MenuQueryInput, user: AuthUser): Promise<{
    menus: Menu[];
    total: number;
  }> {
    // 构建查询条件
    const conditions = [];

    // 如果指定了家庭组，检查权限并添加条件
    if (query.familyGroupId) {
      await this.checkFamilyMembership(query.familyGroupId, user);
      conditions.push(eq(menus.familyGroupId, query.familyGroupId));
    } else {
      // 如果没有指定家庭组，只查询用户的个人菜单
      conditions.push(
        and(
          eq(menus.createdBy, user.id),
          isNull(menus.familyGroupId)
        )
      );
    }

    if (query.status) {
      conditions.push(eq(menus.status, query.status));
    }

    if (query.startDate && query.endDate) {
      conditions.push(
        between(menus.startDate, query.startDate, query.endDate)
      );
    }

    // 计算分页
    const offset = (query.page - 1) * query.limit;

    // 查询菜单
    const [menuList, [{ count }]] = await Promise.all([
      this.db.query.menus.findMany({
        where: and(...conditions),
        limit: query.limit,
        offset,
        orderBy: (menus, { desc }) => [desc(menus.createdAt)],
      }),
      this.db.select({ count: sql`count(*)` })
        .from(menus)
        .where(and(...conditions)),
    ]);

    return {
      menus: menuList,
      total: Number(count),
    };
  }

  // 添加菜单项
  async addMenuItem(menuId: string, input: AddMenuItemInput, user: AuthUser): Promise<MenuItem> {
    // 获取菜单
    const menu = await this.db.query.menus.findFirst({
      where: eq(menus.id, menuId),
    });

    if (!menu) {
      throw new HTTPException(404, { message: 'Menu not found' });
    }

    // 检查家庭组成员权限
    if (menu.familyGroupId) {
      await this.checkFamilyMembership(menu.familyGroupId, user);
    } else if (menu.createdBy !== user.id) {
      // 如果是个人菜单，只有创建者可以添加菜单项
      throw new HTTPException(403, { message: 'Not authorized to add menu item' });
    }

    // 检查日期是否在菜单范围内
    if (input.date < menu.startDate || input.date > menu.endDate) {
      throw new HTTPException(400, { message: 'Date must be within menu date range' });
    }

    // 检查食谱是否存在且属于家庭组
    const recipe = await this.db.query.recipes.findFirst({
      where: eq(recipes.id, input.recipeId),
    });

    if (!recipe || (menu.familyGroupId && recipe.familyGroupId !== menu.familyGroupId)) {
      throw new HTTPException(404, { message: 'Recipe not found in family group' });
    }

    const insertData: NewDbMenuItem = {
      id: nanoid(),
      menuId,
      recipeId: input.recipeId,
      date: input.date,
      mealTime: input.mealTime,
      servings: input.servings || 1,
      orderIndex: input.orderIndex ?? 0,
      note: input.note || null,
    };

    // 添加菜单项
    const [menuItem] = await this.db.insert(menuItems).values(insertData).returning();
    return {
      ...menuItem,
      recipe: {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        category: recipe.category,
        difficulty: recipe.difficulty,
      },
    };
  }

  // 更新菜单项
  async updateMenuItem(
    menuId: string,
    itemId: string,
    input: UpdateMenuItemInput,
    user: AuthUser
  ): Promise<MenuItem> {
    // 获取菜单项
    const menuItem = await this.db.query.menuItems.findFirst({
      where: and(
        eq(menuItems.id, itemId),
        eq(menuItems.menuId, menuId)
      ),
      with: {
        menu: true,
        recipe: true,
      },
    });

    if (!menuItem) {
      throw new HTTPException(404, { message: 'Menu item not found' });
    }

    // 检查家庭组成员权限
    if (menuItem.menu.familyGroupId) {
      await this.checkFamilyMembership(menuItem.menu.familyGroupId, user);
    } else if (menuItem.menu.createdBy !== user.id) {
      // 如果是个人菜单，只有创建者可以更新菜单项
      throw new HTTPException(403, { message: 'Not authorized to update menu item' });
    }

    // 更新菜单项
    const [updatedMenuItem] = await this.db.update(menuItems)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, itemId))
      .returning();

    return {
      ...updatedMenuItem,
      recipe: {
        id: menuItem.recipe.id,
        name: menuItem.recipe.name,
        description: menuItem.recipe.description,
        category: menuItem.recipe.category,
        difficulty: menuItem.recipe.difficulty,
      },
    };
  }

  // 删除菜单项
  async deleteMenuItem(menuId: string, itemId: string, user: AuthUser): Promise<void> {
    // 获取菜单项
    const menuItem = await this.db.query.menuItems.findFirst({
      where: and(
        eq(menuItems.id, itemId),
        eq(menuItems.menuId, menuId)
      ),
      with: {
        menu: true,
      },
    });

    if (!menuItem) {
      throw new HTTPException(404, { message: 'Menu item not found' });
    }

    // 检查家庭组成员权限
    if (menuItem.menu.familyGroupId) {
      await this.checkFamilyMembership(menuItem.menu.familyGroupId, user);
    } else if (menuItem.menu.createdBy !== user.id) {
      // 如果是个人菜单，只有创建者可以删除菜单项
      throw new HTTPException(403, { message: 'Not authorized to delete menu item' });
    }

    // 删除菜单项
    await this.db.delete(menuItems)
      .where(eq(menuItems.id, itemId));
  }

  // 获取菜单项列表
  async getMenuItems(menuId: string, user: AuthUser) {
    // 获取菜单
    const menu = await this.db.query.menus.findFirst({
      where: eq(menus.id, menuId),
    });

    if (!menu) {
      throw new HTTPException(404, { message: 'Menu not found' });
    }

    // 如果是家庭组菜单，检查权限
    if (menu.familyGroupId) {
      await this.checkFamilyMembership(menu.familyGroupId, user);
    } else if (menu.createdBy !== user.id) {
      // 如果是个人菜单，只有创建者可以查看
      throw new HTTPException(403, { message: 'Not authorized to view this menu' });
    }

    // 获取菜单项
    const items = await this.db.query.menuItems.findMany({
      where: eq(menuItems.menuId, menuId),
      with: {
        recipe: true,
      },
      orderBy: (menuItems, { asc }) => [asc(menuItems.date), asc(menuItems.mealTime)],
    });

    return items;
  }

  // 创建菜单分享
  async createMenuShare(menuId: string, input: CreateMenuShareInput, user: AuthUser): Promise<MenuShare> {
    // 获取菜单
    const menu = await this.db.query.menus.findFirst({
      where: eq(menus.id, menuId),
    });

    if (!menu) {
      throw new HTTPException(404, { message: 'Menu not found' });
    }

    // 检查家庭组成员权限
    if (menu.familyGroupId) {
      await this.checkFamilyMembership(menu.familyGroupId, user);
    } else if (menu.createdBy !== user.id) {
      // 如果是个人菜单，只有创建者可以分享
      throw new HTTPException(403, { message: 'Not authorized to share this menu' });
    }

    // 生成分享记录
    const [share] = await this.db.insert(menuShares).values({
      id: nanoid(),
      menuId,
      shareType: input.shareType,
      token: input.shareType === 'TOKEN' ? nanoid(32) : null,
      expiresAt: input.expiresAt,
      createdBy: user.id,
    }).returning();

    return share;
  }

  // 验证分享token
  async validateShareToken(menuId: string, token: string) {
    const share = await this.db.query.menuShares.findFirst({
      where: and(
        eq(menuShares.menuId, menuId),
        eq(menuShares.token, token),
      ),
    });

    if (!share) {
      return null;
    }

    // 检查是否过期
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return null;
    }

    return share;
  }

  // 通过分享链接获取菜单
  async getSharedMenu(shareId: string, token?: string): Promise<MenuWithItems> {
    // 获取分享记录
    const share = await this.db.query.menuShares.findFirst({
      where: eq(menuShares.id, shareId),
    });

    if (!share) {
      throw new HTTPException(404, { message: 'Share not found' });
    }

    // 检查是否过期
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new HTTPException(403, { message: 'Share has expired' });
    }

    // 如果是token类型，验证token
    if (share.shareType === 'TOKEN') {
      if (!token || token !== share.token) {
        throw new HTTPException(403, { message: 'Invalid token' });
      }
    }

    // 获取菜单详情
    const menu = await this.db.query.menus.findFirst({
      where: eq(menus.id, share.menuId),
      with: {
        items: {
          with: {
            recipe: true,
          },
        },
      },
    });

    if (!menu) {
      throw new HTTPException(404, { message: 'Menu not found' });
    }

    return menu;
  }

  // 获取菜单的分享列表
  async getMenuShares(menuId: string, user: AuthUser): Promise<MenuShare[]> {
    // 获取菜单
    const menu = await this.db.query.menus.findFirst({
      where: eq(menus.id, menuId),
    });

    if (!menu) {
      throw new HTTPException(404, { message: 'Menu not found' });
    }

    // 检查家庭组成员权限
    if (menu.familyGroupId) {
      await this.checkFamilyMembership(menu.familyGroupId, user);
    } else if (menu.createdBy !== user.id) {
      // 如果是个人菜单，只有创建者可以查看分享列表
      throw new HTTPException(403, { message: 'Not authorized to view share list' });
    }

    // 获取分享列表
    const shares = await this.db.query.menuShares.findMany({
      where: eq(menuShares.menuId, menuId),
    });

    return shares;
  }

  // 删除菜单分享
  async deleteMenuShare(shareId: string, user: AuthUser): Promise<void> {
    // 获取分享记录
    const share = await this.db.query.menuShares.findFirst({
      where: eq(menuShares.id, shareId),
      with: {
        menu: true,
      },
    });

    if (!share) {
      throw new HTTPException(404, { message: 'Share not found' });
    }

    // 检查家庭组成员权限
    if (share.menu.familyGroupId) {
      await this.checkFamilyMembership(share.menu.familyGroupId, user);
    } else if (share.menu.createdBy !== user.id) {
      // 如果是个人菜单，只有创建者可以删除分享
      throw new HTTPException(403, { message: 'Not authorized to delete share' });
    }

    // 删除分享记录
    await this.db.delete(menuShares)
      .where(eq(menuShares.id, shareId));
  }
}
