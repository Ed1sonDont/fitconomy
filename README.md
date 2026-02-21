# Fitconomy

> **把减肥变成最好的投资** — 游戏化体重管理应用

记录体重和饮食，获得虚拟资产收益。让健康管理像经营股票 + 模拟餐厅一样上瘾。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | FastAPI (Python 3.12) + SQLAlchemy 2.0 + Alembic |
| 前端 | Next.js 15 (App Router) + Tailwind CSS + shadcn/ui |
| 数据库 | PostgreSQL 16 |
| 缓存 | Redis 7 |
| 对象存储 | MinIO (本地) / AWS S3 (生产) |
| 容器 | Docker Compose |

---

## 快速开始

### 前置要求
- Docker & Docker Compose
- Node.js 20+
- Python 3.12+

### 1. 启动基础设施

```bash
docker compose up -d db redis minio
```

### 2. 启动后端

```bash
cd backend
cp .env.example .env        # 编辑配置（默认值可直接使用）
pip install uv
uv pip install -e .
uvicorn app.main:app --reload
```

后端运行在 http://localhost:8000  
API 文档：http://localhost:8000/api/docs

### 3. 启动前端

```bash
cd frontend
npm install
# .env.local 已预配置 NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev
```

前端运行在 http://localhost:3000

### 4. 一键启动（Docker 全栈）

```bash
docker compose up --build
```

---

## 核心功能（MVP）

- **用户系统** — 注册/登录，JWT 认证
- **体重资产系统** — 体重下降 → 虚拟资产上升，股票曲线可视化
- **饮食记录** — 记录餐次、热量、上传食物图片
- **虚拟餐厅** — 食物生成像素图标，资产影响餐厅等级和客流
- **每日仪表盘** — 资产曲线、体重趋势、热量进度、连续打卡天数

---

## 项目结构

```
fitconomy/
├── backend/          # FastAPI 后端
│   ├── app/
│   │   ├── models/    # SQLAlchemy ORM 模型
│   │   ├── schemas/   # Pydantic 请求/响应模型
│   │   ├── routers/   # API 路由
│   │   ├── services/  # 业务逻辑（含资产引擎）
│   │   └── core/      # JWT、存储、依赖注入
│   └── app/migrations/ # Alembic 迁移
├── frontend/         # Next.js 前端
│   └── src/
│       ├── app/       # App Router 页面
│       ├── components/ # 可复用组件（图表、像素）
│       └── lib/       # API 客户端、Zustand store
└── docker-compose.yml
```

---

## 资产引擎算法

```
初始资产：₣ 1000

体重触发：
  每减 0.1 kg → +0.5%
  每增 0.1 kg → -0.3%（底线：₣ 100）

饮食触发：
  记录一次饮食 → +0.1%
  热量在目标 80%–110% 范围 → 额外 +0.2%

连续打卡奖励：
  3 天连续 → +1%
  7 天连续 → +3%
```

---

## Phase 2 规划

- AI 食物图像识别（OpenAI Vision）
- 菜谱系统 + 地区化推荐
- 像素餐厅动态客流动画
- Capacitor 打包为 iOS/Android App
- 社交排行榜
