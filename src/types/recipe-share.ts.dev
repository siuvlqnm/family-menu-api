import { z } from 'zod';

// 共享类型
export const ShareType = {
  COPY: 'copy', // 复制到目标家庭组
  LINK: 'link', // 链接到源食谱
} as const;

// 共享食谱到家庭组验证 schema
export const shareRecipeSchema = z.object({
  recipeId: z.string(),
  targetFamilyGroupId: z.string(),
  shareType: z.enum(Object.values(ShareType)),
});

// 批量共享食谱到家庭组验证 schema
export const shareManyRecipesSchema = z.object({
  recipeIds: z.array(z.string()),
  targetFamilyGroupId: z.string(),
  shareType: z.enum(Object.values(ShareType)),
});

// 类型定义
export type ShareRecipeInput = z.infer<typeof shareRecipeSchema>;
export type ShareManyRecipesInput = z.infer<typeof shareManyRecipesSchema>;

export interface RecipeShare {
  id: string;
  recipeId: string;
  sourceFamilyGroupId: string;
  targetFamilyGroupId: string;
  shareType: typeof ShareType[keyof typeof ShareType];
  sharedBy: string;
  sharedAt: Date;
}
