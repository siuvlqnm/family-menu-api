import { eq, and, desc, asc, like, or, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { Database, recipes, familyMembers } from '../db';
import type {
  CreateRecipeInput,
  UpdateRecipeInput,
  Recipe,
  RecipeQuery,
} from '../types/recipe';

// 数据库记录类型
type DbRecipe = typeof recipes.$inferSelect;
type NewDbRecipe = typeof recipes.$inferInsert;

export class RecipeService {
  private static instance: RecipeService;
  private db!: Database;

  private constructor() {}

  public static getInstance(db: Database): RecipeService {
    if (!RecipeService.instance) {
      RecipeService.instance = new RecipeService();
    }
    RecipeService.instance.db = db;
    return RecipeService.instance;
  }

  // 创建食谱
  async createRecipe(userID: string, data: CreateRecipeInput): Promise<Recipe> {
    const recipeId = nanoid();
    const now = new Date();

    const recipe: NewDbRecipe = {
      id: recipeId,
      name: data.name,
      description: data.description ?? null,
      category: data.category,
      difficulty: data.difficulty,
      prepTime: data.prepTime ?? null,
      cookTime: data.cookTime ?? null,
      servings: data.servings ?? null,
      ingredients: data.ingredients,
      steps: data.steps,
      favorites: 0,
      rating: 0,
      tags: [],
      createdBy: userID,
      familyGroupId: data.familyGroupId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const [createdRecipe] = await this.db.insert(recipes).values(recipe).returning();
    return this.mapToRecipe(createdRecipe);
  }

  // 更新食谱
  async updateRecipe(
    id: string,
    userID: string,
    data: UpdateRecipeInput
  ): Promise<Recipe | null> {
    const existingRecipe = await this.getRecipe(id, userID);
    if (!existingRecipe) {
      return null;
    }

    const updateData: Partial<NewDbRecipe> = {
      name: data.name,
      description: data.description ?? null,
      category: data.category,
      difficulty: data.difficulty,
      prepTime: data.prepTime ?? null,
      cookTime: data.cookTime ?? null,
      servings: data.servings ?? null,
      ingredients: data.ingredients,
      steps: data.steps,
      familyGroupId: data.familyGroupId ?? null,
      updatedAt: new Date(),
    };

    // 移除未定义的字段
    (Object.keys(updateData) as Array<keyof typeof updateData>).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const [recipe] = await this.db
      .update(recipes)
      .set(updateData)
      .where(eq(recipes.id, id))
      .returning();

    return this.mapToRecipe(recipe);
  }

  // 获取单个食谱
  async getRecipe(id: string, userID: string): Promise<Recipe | null> {
    const familyGroupIds = await this.getUserFamilyGroupIds(userID);
    
    const recipe = await this.db.query.recipes.findFirst({
      where: and(
        eq(recipes.id, id),
        familyGroupIds.length > 0
          ? or(
              eq(recipes.createdBy, userID),
              inArray(recipes.familyGroupId, familyGroupIds)
            )
          : eq(recipes.createdBy, userID)
      ),
    });

    return recipe ? this.mapToRecipe(recipe) : null;
  }

  // 获取食谱列表
  async listRecipes(userID: string, query: RecipeQuery): Promise<Recipe[]> {
    const { category, difficulty, search, familyGroupId, page, limit, sort } = query;
    const offset = (page - 1) * limit;

    const familyGroupIds = await this.getUserFamilyGroupIds(userID);
    let conditions = [];

    conditions.push(
      familyGroupIds.length > 0
        ? or(
            eq(recipes.createdBy, userID),
            inArray(recipes.familyGroupId, familyGroupIds)
          )
        : eq(recipes.createdBy, userID)
    );

    if (category) {
      conditions.push(eq(recipes.category, category));
    }
    if (difficulty) {
      conditions.push(eq(recipes.difficulty, difficulty));
    }
    if (familyGroupId) {
      conditions.push(eq(recipes.familyGroupId, familyGroupId));
    }
    if (search) {
      conditions.push(
        or(
          like(recipes.name, `%${search}%`),
          like(recipes.description || '', `%${search}%`)
        )
      );
    }

    // 排序
    let orderBy = desc(recipes.createdAt); // 默认按创建时间倒序
    if (sort === 'LATEST') {
      orderBy = desc(recipes.createdAt);
    } else if (sort === 'POPULAR') {
      orderBy = desc(recipes.favorites);
    } else if (sort === 'RATING') {
      orderBy = desc(recipes.rating);
    }

    const result = await this.db
      .select()
      .from(recipes)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return result.map(recipe => this.mapToRecipe(recipe));
  }

  // 删除食谱
  async deleteRecipe(id: string, userID: string): Promise<boolean> {
    const existingRecipe = await this.getRecipe(id, userID);
    if (!existingRecipe) {
      return false;
    }

    await this.db.delete(recipes).where(eq(recipes.id, id));
    return true;
  }

  // 获取用户所在的家庭组ID列表
  private async getUserFamilyGroupIds(userID: string): Promise<string[]> {
    const members = await this.db
      .select({ familyGroupId: familyMembers.familyGroupId })
      .from(familyMembers)
      .where(eq(familyMembers.userId, userID));

    return members.map(m => m.familyGroupId);
  }

  // 将数据库记录映射为 Recipe 类型
  private mapToRecipe(data: DbRecipe): Recipe {
    return {
      ...data,
      ingredients: typeof data.ingredients === 'string' ? JSON.parse(data.ingredients) : data.ingredients || [],
      steps: typeof data.steps === 'string' ? JSON.parse(data.steps) : data.steps || [],
      tags: typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags || [],
      rating: Number(data.rating) || 0,
      favorites: Number(data.favorites) || 0,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }
}
