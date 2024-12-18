import { sql, relations } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { MeasurementUnit } from '../types/recipe';

// 定义食材接口
export interface Ingredient {
  name: string;
  // amount: number;
  quantity: number;
  unit: keyof typeof MeasurementUnit;
  orderIndex: number;
}

export interface Step {
  orderIndex: number;
  description: string;
}

// 用户表
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  userName: text('user_name').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// 家庭组表
export const familyGroups = sqliteTable('family_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// 家庭组成员表
export const familyMembers = sqliteTable('family_members', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  familyGroupId: text('family_group_id')
    .notNull()
    .references(() => familyGroups.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['admin', 'member'] }).notNull(),
  joinedAt: integer('joined_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// 食谱表
export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category', {
    enum: ['MEAT', 'VEGETABLE', 'SOUP', 'STAPLE', 'SNACK'],
  }).notNull(),
  difficulty: text('difficulty', {
    enum: ['EASY', 'MEDIUM', 'HARD'],
  }).notNull(),
  prepTime: integer('prep_time'),
  cookTime: integer('cook_time'),
  servings: integer('servings'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  familyGroupId: text('family_group_id').references(() => familyGroups.id, {
    onDelete: 'cascade',
  }),
  ingredients: text('ingredients', { mode: 'json' }).notNull().$type<Ingredient[]>(),
  steps: text('steps', { mode: 'json' }).notNull().$type<Step[]>(),
  favorites: integer('favorites').notNull().default(0),
  rating: integer('rating').notNull().default(0),
  // tags: text('tags').notNull().default('[]'),
  tags: text('tags', { mode: 'json' }).notNull().$type<string[]>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// 食谱共享表
export const recipeShares = sqliteTable('recipe_shares', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  sourceFamilyGroupId: text('source_family_group_id')
    .references(() => familyGroups.id),
  targetFamilyGroupId: text('target_family_group_id')
    .notNull()
    .references(() => familyGroups.id, { onDelete: 'cascade' }),
  shareType: text('share_type', { enum: ['copy', 'link'] }).notNull(),
  sharedBy: text('shared_by')
    .notNull()
    .references(() => users.id),
  sharedAt: integer('shared_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// 菜单表
export const menus = sqliteTable('menus', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type', {
    enum: ['DAILY', 'WEEKLY', 'HOLIDAY', 'SPECIAL']
  }).notNull().default('DAILY'),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  status: text('status', {
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
  })
    .notNull()
    .default('DRAFT'),
  familyGroupId: text('family_group_id')
    .references(() => familyGroups.id, { onDelete: 'cascade' }),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// 菜单项表
export const menuItems = sqliteTable('menu_items', {
  id: text('id').primaryKey(),
  menuId: text('menu_id')
    .notNull()
    .references(() => menus.id, { onDelete: 'cascade' }),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  mealTime: text('meal_time', {
    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'],
  }).notNull(),
  servings: integer('servings').notNull().default(1),
  orderIndex: integer('order_index').notNull().default(0),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// 菜单分享表
export const menuShares = sqliteTable('menu_shares', {
  id: text('id').primaryKey(),
  menuId: text('menu_id')
    .notNull()
    .references(() => menus.id, { onDelete: 'cascade' }),
  shareType: text('share_type', { enum: ['LINK', 'TOKEN'] }).notNull(),
  token: text('token').unique(),
  allowEdit: integer('allow_edit', { mode: 'boolean' }).notNull().default(false),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
});

// 定义菜单与菜单项的关系
export const menusRelations = relations(menus, ({ many }) => ({
  items: many(menuItems),
  shares: many(menuShares)
}));

// 定义菜单项与菜单的关系
export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  menu: one(menus, {
    fields: [menuItems.menuId],
    references: [menus.id],
  }),
  recipe: one(recipes, {
    fields: [menuItems.recipeId],
    references: [recipes.id],
  }),
}));

// 定义菜单分享与菜单的关系
export const menuSharesRelations = relations(menuShares, ({ one }) => ({
  menu: one(menus, {
    fields: [menuShares.menuId],
    references: [menus.id],
  }),
}));
