# Family Menu Functions

家庭菜单应用的后端 API 服务，基于 Cloudflare Workers。

## 技术栈

- Hono: Web 框架
- Drizzle: 数据库 ORM
- Zod: 数据验证
- TypeScript: 开发语言

## 开发

1. 安装依赖：

```bash
npm install
```

2. 创建 D1 数据库：

```bash
wrangler d1 create family-menu
```

3. 更新数据库：

```bash
npm run generate  # 生成迁移文件
npm run push     # 应用迁移
```

4. 本地开发：

```bash
npm run dev
```

5. 部署：

```bash
npm run deploy
```

## API 文档

### 认证

- POST /auth/register - 用户注册
- POST /auth/login - 用户登录

### 家庭组

- GET /family - 获取家庭组列表
- POST /family - 创建家庭组
- GET /family/:id - 获取家庭组详情
- PUT /family/:id - 更新家庭组
- DELETE /family/:id - 删除家庭组

### 菜单

- GET /menu - 获取菜单列表
- POST /menu - 创建菜单
- GET /menu/:id - 获取菜单详情
- PUT /menu/:id - 更新菜单
- DELETE /menu/:id - 删除菜单

### 食谱

- GET /recipe - 获取食谱列表
- POST /recipe - 创建食谱
- GET /recipe/:id - 获取食谱详情
- PUT /recipe/:id - 更新食谱
- DELETE /recipe/:id - 删除食谱

### 食谱分享

- POST /recipe-share - 分享食谱
- GET /recipe-share/received - 获取收到的分享
- GET /recipe-share/sent - 获取发出的分享
