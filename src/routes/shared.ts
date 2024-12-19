import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { SharedService } from '../services/shared';
import { createDb } from '../db';
import { Bindings } from '../config';

const shared = new Hono<{ Bindings: Bindings }>();

// 获取分享的菜单（公开访问）
shared.get(
  '/:shareId',
  async (c) => {
    const shareId = c.req.param('shareId');
    const db = createDb(c.env.DB);
    const sharedService = new SharedService(db);
    
    const menu = await sharedService.getSharedMenu(shareId);
    
    return c.json(menu);
  }
);

export { shared as sharedRouter };
