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

// 数据库记录类型
export type DbMenuItem = typeof menuItems.$inferSelect;
export type NewDbMenuItem = typeof menuItems.$inferInsert;

export class SharedService {
  constructor(private db: Database) {}

  // 通过分享链接获取菜单
  async getSharedMenu(shareId: string): Promise<MenuWithItems> {
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
    // if (share.shareType === 'TOKEN') {
    //   if (!token || token !== share.token) {
    //     throw new HTTPException(403, { message: 'Invalid token' });
    //   }
    // }

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
}
