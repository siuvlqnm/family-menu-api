import { and, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { Database, familyMembers, recipeShares, recipes } from '../db';
import { ShareManyRecipesInput, ShareRecipeInput, ShareType } from '../types/recipe-share';
import { AuthUser } from '../types/auth';
import { nanoid } from '../utils/id';
import { Recipe } from '../types/recipe';

export class RecipeShareService {
  constructor(private db: Database) {}

  // 检查用户是否是家庭组成员
  private async checkFamilyMembership(familyGroupId: string, userId: string): Promise<void> {
    const member = await this.db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.familyGroupId, familyGroupId),
        eq(familyMembers.userId, userId)
      ),
    });

    if (!member) {
      throw new HTTPException(403, { message: 'Not a member of this family group' });
    }
  }

  // 复制食谱到目标家庭组
  private async copyRecipeToGroup(
    recipe: Recipe,
    targetFamilyGroupId: string,
    user: AuthUser
  ): Promise<Recipe> {
    const [newRecipe] = await this.db.insert(recipes).values({
      id: nanoid(),
      title: recipe.title,
      description: recipe.description,
      category: recipe.category,
      difficulty: recipe.difficulty,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      createdBy: user.id,
      familyGroupId: targetFamilyGroupId,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
    }).returning();

    return newRecipe;
  }

  // 共享单个食谱
  async shareRecipe(input: ShareRecipeInput, user: AuthUser): Promise<void> {
    // 获取源食谱
    const recipe = await this.db.query.recipes.findFirst({
      where: eq(recipes.id, input.recipeId),
    });

    if (!recipe) {
      throw new HTTPException(404, { message: 'Recipe not found' });
    }

    // 检查源家庭组成员权限
    if (recipe.familyGroupId) {
      await this.checkFamilyMembership(recipe.familyGroupId, user.id);
    } else if (recipe.createdBy !== user.id) {
      throw new HTTPException(403, { message: 'Not authorized to share this recipe' });
    }

    // 检查目标家庭组成员权限
    await this.checkFamilyMembership(input.targetFamilyGroupId, user.id);

    // 如果是复制类型，创建新食谱
    if (input.shareType === ShareType.COPY) {
      await this.copyRecipeToGroup(recipe, input.targetFamilyGroupId, user);
    }

    // 记录共享记录
    await this.db.insert(recipeShares).values({
      id: nanoid(),
      recipeId: input.recipeId,
      sourceFamilyGroupId: recipe.familyGroupId || '',
      targetFamilyGroupId: input.targetFamilyGroupId,
      shareType: input.shareType,
      sharedBy: user.id,
    });
  }

  // 批量共享食谱
  async shareManyRecipes(input: ShareManyRecipesInput, user: AuthUser): Promise<void> {
    // 获取所有源食谱
    const recipeList = await this.db.query.recipes.findMany({
      where: eq(recipes.id, input.recipeIds),
    });

    if (recipeList.length !== input.recipeIds.length) {
      throw new HTTPException(404, { message: 'Some recipes not found' });
    }

    // 检查源家庭组成员权限
    for (const recipe of recipeList) {
      if (recipe.familyGroupId) {
        await this.checkFamilyMembership(recipe.familyGroupId, user.id);
      } else if (recipe.createdBy !== user.id) {
        throw new HTTPException(403, { message: 'Not authorized to share some recipes' });
      }
    }

    // 检查目标家庭组成员权限
    await this.checkFamilyMembership(input.targetFamilyGroupId, user.id);

    // 开始事务
    await this.db.transaction(async (tx) => {
      for (const recipe of recipeList) {
        // 如果是复制类型，创建新食谱
        if (input.shareType === ShareType.COPY) {
          await this.copyRecipeToGroup(recipe, input.targetFamilyGroupId, user);
        }

        // 记录共享记录
        await tx.insert(recipeShares).values({
          id: nanoid(),
          recipeId: recipe.id,
          sourceFamilyGroupId: recipe.familyGroupId || '',
          targetFamilyGroupId: input.targetFamilyGroupId,
          shareType: input.shareType,
          sharedBy: user.id,
        });
      }
    });
  }

  // 获取食谱的共享记录
  async getRecipeShares(recipeId: string, user: AuthUser): Promise<RecipeShare[]> {
    // 获取食谱
    const recipe = await this.db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
    });

    if (!recipe) {
      throw new HTTPException(404, { message: 'Recipe not found' });
    }

    // 检查源家庭组成员权限
    if (recipe.familyGroupId) {
      await this.checkFamilyMembership(recipe.familyGroupId, user.id);
    } else if (recipe.createdBy !== user.id) {
      throw new HTTPException(403, { message: 'Not authorized to view shares' });
    }

    // 获取共享记录
    const shares = await this.db.query.recipeShares.findMany({
      where: eq(recipeShares.recipeId, recipeId),
    });

    return shares;
  }

  // 获取家庭组接收的共享食谱
  async getSharedRecipes(familyGroupId: string, user: AuthUser): Promise<Recipe[]> {
    // 检查家庭组成员权限
    await this.checkFamilyMembership(familyGroupId, user.id);

    // 获取链接类型的共享记录
    const shares = await this.db.query.recipeShares.findMany({
      where: and(
        eq(recipeShares.targetFamilyGroupId, familyGroupId),
        eq(recipeShares.shareType, ShareType.LINK)
      ),
    });

    // 获取链接的食谱
    const sharedRecipes = await this.db.query.recipes.findMany({
      where: eq(recipes.id, shares.map(s => s.recipeId)),
    });

    return sharedRecipes;
  }
}
