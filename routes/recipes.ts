import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createRecipeSchema, recipeQuerySchema, updateRecipeSchema } from '../types/recipe';
import { RecipeService } from '../services/recipes';
import { authMiddleware, getCurrentUser } from '../middleware/auth';
import { HTTPException } from 'hono/http-exception';
import { createDb } from '../db';
import { Bindings } from '../config';

const recipe = new Hono<{ Bindings: Bindings }>();

// 获取食谱列表
recipe.get('/', authMiddleware, async (c) => {
  const query = c.req.query();
  const parsedQuery = {
    ...query,
    page: query.page ? parseInt(query.page) : undefined,
    limit: query.limit ? parseInt(query.limit) : undefined
  };
  const validatedQuery = recipeQuerySchema.parse(parsedQuery);
  const user = await getCurrentUser(c);
  const recipeService = RecipeService.getInstance(createDb(c.env.DB));
  
  const recipes = await recipeService.listRecipes(user.id, validatedQuery);
  return c.json(recipes);
});

// 创建食谱
recipe.post('/', authMiddleware, zValidator('json', createRecipeSchema), async (c) => {
  const data = c.req.valid('json');
  const user = await getCurrentUser(c);
  const recipeService = RecipeService.getInstance(createDb(c.env.DB));
  
  const recipe = await recipeService.createRecipe(user.id, data);
  return c.json(recipe, 201);
});

// 获取单个食谱
recipe.get('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const user = await getCurrentUser(c);
  const recipeService = RecipeService.getInstance(createDb(c.env.DB));
  
  const recipe = await recipeService.getRecipe(id, user.id);
  if (!recipe) {
    throw new HTTPException(404, { message: '食谱不存在' });
  }
  
  return c.json(recipe);
});

// 更新食谱
recipe.put('/:id', authMiddleware, zValidator('json', updateRecipeSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const user = await getCurrentUser(c);
  const recipeService = RecipeService.getInstance(createDb(c.env.DB));
  
  const recipe = await recipeService.updateRecipe(id, user.id, data);
  if (!recipe) {
    throw new HTTPException(404, { message: '食谱不存在' });
  }
  
  return c.json(recipe);
});

// 删除食谱
recipe.delete('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const user = await getCurrentUser(c);
  const recipeService = RecipeService.getInstance(createDb(c.env.DB));
  
  const success = await recipeService.deleteRecipe(id, user.id);
  if (!success) {
    throw new HTTPException(404, { message: '食谱不存在' });
  }
  
  return c.json({ success: true });
});

export { recipe as recipeRouter };
