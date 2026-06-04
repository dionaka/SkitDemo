# 短剧互动平台（SkitDemo）

短剧播放 + 高光互动 Demo，含 **Web 用户端**、**管理后台**、**Android App** 与 **Node.js 后端**。

## 项目结构

```
SkitDemo/
├── backend/           # Express + SQLite API
├── frontend/          # Vue3 管理端 + Web 用户端
├── frontend-mobile/   # Capacitor Android 用户端
├── docs/              # CHANGELOG、部署说明
└── uploads/           # 视频/封面（本地，不入库）
```

## 主要功能

| 端 | 能力 |
|----|------|
| 用户端（Web / App） | 剧集列表、续播、**弹幕**、高光互动、剧情分支、收藏、评论、离线缓存、个性主题 |
| 管理端 | 登录、本地上传、**链接解析导入**（B站/抖音/小红书）、AI 高光分析、**弹幕生成高光**、评论审核 |
| 后端 | REST API、JWT、SQLite、yt-dlp 链接解析、双来源高光（AI 视频 + 弹幕密集区） |

**弹幕与高光：** 播放页可发弹幕（需登录）；管理端可分析弹幕密集区生成高光，与 AI 视频分析并存，±5 秒内自动合并，手动高光优先。

详细更新见 [docs/CHANGELOG.md](docs/CHANGELOG.md)。

## 快速启动

```bash
# 后端（8080）
cd backend && npm install && npm run dev

# Web 前端（5173）
cd frontend && npm install && npm run dev
```

**Linux 服务器** 需系统依赖时执行：

```bash
bash backend/scripts/install-linux-deps.sh   # ffmpeg 等
bash backend/scripts/install-yt-dlp.sh       # 链接解析
```

## 访问地址

| 入口 | 地址 |
|------|------|
| 用户端 | http://localhost:5173 |
| 管理后台 | http://localhost:5173/admin/login |
| Android App | 见 [frontend-mobile/README.md](frontend-mobile/README.md) |

默认管理员：`admin` / `admin123`

豆包 API Key 请在管理后台 **设置** 页配置（加密存于本机，勿写入代码）。

## 常用文档

- [Android 打包与联调](frontend-mobile/README.md)
- [推送到 GitHub](docs/GITHUB_UPLOAD.md)
- [更新日志](docs/CHANGELOG.md)
