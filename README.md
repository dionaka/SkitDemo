# 短剧互动平台 Demo

基于方案文档 v1.1 实现的完整闭环 Demo，包含用户端、管理端、服务端、大模型调度四大模块。

## 项目结构

```
L/
├── backend/                    # 后端服务 (Node.js + Express)
│   └── src/
│       ├── config/             # 配置 & Prompt
│       ├── controllers/        # 控制器（按用户端/管理端分）
│       │   ├── user/           # 视频列表、互动
│       │   └── admin/          # 登录、视频管理、高光管理
│       ├── services/           # 业务逻辑
│       │   ├── videoService.js
│       │   ├── highlightService.js
│       │   ├── interactionService.js
│       │   ├── aiModelService.js
│       │   └── adminService.js
│       ├── routes/             # 路由
│       ├── middleware/         # 认证 & 文件上传
│       └── db/                 # SQLite 数据库
├── frontend/                   # 前端 (Vue3 + Vite + Element Plus)
│   └── src/
│       ├── views/
│       │   ├── user/           # 短剧列表、播放页
│       │   └── admin/          # 登录、视频管理、高光管理
│       ├── components/
│       │   ├── VideoPlayer/    # 播放器 + 高光标记
│       │   ├── InteractionPanel/ # 互动面板
│       │   └── effects/        # 特效动画
│       ├── api/                # API 封装
│       └── stores/             # Pinia 状态
├── frontend-mobile/            # Android 用户端 (Capacitor + Vue3)
│   └── README.md               # App 打包与联调说明
├── database/                   # MySQL 建表脚本（可选）
└── uploads/                    # 本地视频/封面存储
    ├── videos/
    └── covers/
```

## 功能清单

| 模块 | 功能 |
|------|------|
| 用户端 | 短剧列表、视频播放/暂停/进度条/音量、高光点时间轴标记、一键互动、特效动画、互动统计 |
| 管理端 | 登录认证、视频上传、AI 高光分析、高光点 CRUD、视频发布 |
| 服务端 | REST API、JWT 认证、本地文件存储、SQLite 数据库 |
| 大模型 | Doubao-Seed-2.0-lite 集成（无 API Key 时自动使用模拟数据） |

## 版本管理（GitHub）

本地已初始化 Git 仓库，敏感文件已通过 `.gitignore` 排除。

**推送到 GitHub：** 见 [docs/GITHUB_UPLOAD.md](docs/GITHUB_UPLOAD.md)

**更新记录：** 见 [docs/CHANGELOG.md](docs/CHANGELOG.md)

```powershell
cd c:\Users\hp\Desktop\L
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

## 快速启动

### 1. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

#### Linux 云服务器（ECS）若 `npm install` 长时间卡住

常见原因是旧版依赖 **`ffmpeg-static`** 安装时从 GitHub 下载约 70MB 二进制，国内网络易假死。**当前仓库已移除该依赖**，请改用系统 ffmpeg：

```bash
cd ~/SkitDemo
git pull
bash backend/scripts/install-linux-deps.sh
# 或手动：
#   sudo apt update && sudo apt install -y ffmpeg curl build-essential
#   cd backend && npm install
#   bash scripts/install-yt-dlp.sh
ffmpeg -version
```

若仍卡住，可先清理再装：`rm -rf node_modules package-lock.json && npm install`

### 2. 配置豆包 API（管理后台）

**不要将 API Key 写入 `.env` 或代码中。**

1. 启动项目后访问：http://localhost:5173/admin/settings
2. 填写 Endpoint ID 和 API Key，点击保存
3. 密钥会 **AES-256-GCM 加密** 后存到本机 `backend/data/secrets.vault`

打包上传时，以下目录/文件已在 `.gitignore` 中排除，**不会泄露密钥**：

| 文件 | 说明 |
|------|------|
| `backend/data/secrets.vault` | 加密后的 API 配置 |
| `backend/data/.vault-key` | 本机解密密钥（每台电脑独立生成） |
| `backend/.env` | 环境变量 |
| `uploads/` | 上传的视频 |

视频分析流程：
1. 通过 Files API 上传本地视频
2. 等待视频预处理完成
3. 调用 Responses API 识别高光点

### 3. 启动服务

```bash
# 终端 1 - 后端 (端口 8080)
cd backend
npm run dev

# 终端 2 - 前端 (端口 5173)
cd frontend
npm run dev
```

### 4. 访问

- 用户端：http://localhost:5173
- 管理后台：http://localhost:5173/admin/login
- **Android App**：见 [frontend-mobile/README.md](frontend-mobile/README.md)
- 默认管理员：`admin` / `admin123`

## 使用流程

1. 管理后台登录 → 上传本地 MP4 视频
2. 点击「AI 分析」生成高光点（或手动添加/编辑）
3. 点击「发布」使视频对用户可见
4. 用户端浏览短剧列表 → 进入播放页
5. 播放到高光点时弹出互动选项 → 选择后触发特效并记录统计

## API 接口

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/v1/videos` | GET | 获取已发布视频列表 |
| `/api/v1/videos/{id}` | GET | 获取视频详情 + 高光点 |
| `/api/v1/interactions` | POST | 记录用户互动 |
| `/api/v1/interactions/stats/{id}` | GET | 获取互动统计 |
| `/api/admin/login` | POST | 管理员登录 |
| `/api/admin/videos` | POST | 上传视频 |
| `/api/admin/videos/{id}/analyze` | POST | AI 分析高光点 |
| `/api/admin/highlights` | CRUD | 高光点管理 |
| `/api/admin/videos/{id}/publish` | PUT | 发布视频 |

## 技术说明

- 当前环境无 Java/Maven，后端使用 **Node.js + Express** 替代 Spring Boot，API 接口与文档完全一致
- 数据库使用 **SQLite**（零配置），同时提供 MySQL 建表脚本 `database/init.sql`
- 视频文件存储在本地 `uploads/` 目录
- 大模型未配置时使用模拟数据，便于 Demo 演示

## 互动特效类型

| 类型 | 特效 |
|------|------|
| conflict / reversal | 闪电、震动 |
| sweet | 爱心飘落 |
| scene | 弹幕墙 |
