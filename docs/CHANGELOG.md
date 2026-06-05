# 更新日志

## [2026-06-05] 管理端批量 AI 高光分析

- 视频管理页支持多选 / 无高光 / 已发布 / 全部视频的批量 AI 高光生成，带进度弹窗

---

## [2026-06-04] 管理端高光批量操作

- 高光管理：排序（时间/ID/类型/来源）、多选删除、按来源清空、一键清空本集全部高光
- API：`DELETE /api/admin/videos/:videoId/highlights`，`POST /api/admin/highlights/batch-delete`

---

## [2026-06-04] 高光分类扩展（10 类）

- 新增：悬疑、搞笑、催泪、高燃、震惊、金句（原有冲突/反转/撒糖/名场面保留）
- 统一配置 `highlightCategories`，AI 分析/弹幕高光/管理端/播放页标签与进度条颜色同步
- 每类对应独立激发特效（CSS + canvas-confetti 粒子）

---

## [2026-06-04] 高光激发特效注册表

- 用户**选择高光互动选项后**才触发特效（其余场景不触发）
- 特效注册表 `effectRegistry` + `canvas-confetti` 粒子（撒糖/名场面）
- 后端 `highlight` 表预留 `effect_key`、`effect_config`；管理端可选手动指定激发特效

---

## [2026-06-04] 弹幕与弹幕高光

- 播放页集成 [vue-danmaku](https://github.com/hellodigua/vue-danmaku) 弹幕层，支持开关、登录后发弹幕（40 字、5 色）
- 弹幕按播放进度同步；高光互动结束后可二次展示投票统计弹幕
- 后端：`video_danmaku` 表；`GET/POST /api/v1/videos/:id/danmaku`，`DELETE /api/v1/danmaku/:id`
- 弹幕密集区 AI 生成高光（`source=danmaku`），与 AI 视频高光（`source=ai_video`）双来源并存；±5s 内合并去重，手动高光优先
- 管理端高光列表显示来源；「从弹幕生成高光」按钮 + 密度预览
- API：`GET /api/admin/videos/:id/danmaku/density`，`POST .../danmaku/analyze-highlights`

---

## [2026-06-04] 视频评论

- 播放页新增评论列表与发表（需 App 登录）
- 安全：内容过滤 HTML/控制字符、500 字上限、频率限制、软删除
- 管理端可查看/删除评论；API 见 `GET/POST /api/v1/videos/:id/comments`

---

## [2026-06-04] 管理端 Web 配置 B 站 Cookie

- 「视频管理 → 链接解析」新增 **B 站 Cookie 配置** 面板，可直接粘贴、保存、测试、清除
- API：`GET/PUT/DELETE /api/admin/settings/bili-cookies`，`POST .../test`

---

## [2026-06-04] 管理端链接解析上传

- 视频管理页新增 **「链接解析」** 标签页，支持粘贴 B站 / 抖音 / 小红书链接并导入为剧集视频
- 可先 **解析预览** 查看标题、作者、时长与封面，再 **下载并导入**
- 后端基于 `yt-dlp` 下载（参考 [astrbot_plugin_link_resolver](https://github.com/vacacia/astrbot_plugin_link_resolver)）
- API：`POST /api/admin/videos/resolve-link`、`POST /api/admin/videos/import-from-link`
- 服务器需单独安装 yt-dlp：`bash backend/scripts/install-yt-dlp.sh` 或 `pip install yt-dlp`
- 可选：在 `uploads/cookies/bili_cookies.txt` 放置 B 站 Cookie；`YT_DLP_PATH`、`LINK_RESOLVE_MAX_MB`（默认 200）

---

## [2026-06-01] 管理端登录页样式改版

- 管理后台登录页（`/admin/login`）对齐个人网站登录页视觉：渐变动图背景、左右分栏卡片、楷体输入框、黄色虚线登录按钮
- 新增静态资源 `frontend/public/login-assets/`（背景图与左侧插画）
- 登录页全屏展示（隐藏顶栏）；登录失败在页面内显示错误，不再弹 Toast
- 输入框：白底细黑边，选中时边框加粗；字号与行高适配输入框高度

---

## [2026-05-29] 已上传视频编辑分组

- 管理端视频列表新增 **「编辑分组」**，可修改剧名、集数、单集标题、时长
- 支持将已上传视频归入已有剧集，或输入新剧名创建分组
- API：`PUT /api/admin/videos/:id`

---

## [2026-05-29] Vite 代理修复（Linux / 云服务器）

- 开发代理由 `localhost:8080` 改为 `127.0.0.1:8080`，避免 Linux 上解析为 IPv6 `::1` 导致 `ECONNREFUSED`

---

## [2026-05-29] 剧集、续播与管理端增强

### 管理端

- **删除视频**：支持删除单集，同步清理高光点、观看进度与本地视频文件
- **上传默认名称**：选择视频文件后，单集标题自动填入文件名（去扩展名），仍可手动修改
- **剧集上传**：新增剧名、集数字段；电影按「剧名 + 第 1 集」上传即可
- **列表展示**：视频管理表增加剧名、集数列

### 剧集与续播（用户端 Web + Android App）

- **剧集模型**：新增 `series` 表，视频关联 `series_id` 与 `episode_number`
- **首页**：按剧展示；顶部「继续观看」展示未看完的集
- **剧集详情页**：分集列表，显示观看进度条
- **续播**：本地 `localStorage` + 服务端 `watch_progress` 双写；进入播放页自动从上次位置继续

### 返回交互优化

- 统一 `PageBackBar` 返回按钮，更大点击区域
- 智能返回：优先 `router.back()`，无历史时回剧集页/首页
- 修复离开播放页时进度保存失败误弹「视频不存在或未发布」
- Android：播放页隐藏顶栏；系统返回键支持逐级返回

### API 新增

| 路径 | 说明 |
|------|------|
| `DELETE /api/admin/videos/:id` | 删除视频 |
| `GET /api/admin/series` | 管理端剧集列表 |
| `GET /api/v1/series` | 用户端已发布剧集列表 |
| `GET /api/v1/series/:id/episodes` | 剧集分集（含进度） |
| `PUT /api/v1/watch-progress/:videoId` | 保存观看进度 |
| `GET /api/v1/watch-progress/continue` | 继续观看列表 |

---

## [2026-05-28] Android 用户端

### 新增

- **`frontend-mobile/`**：基于 Capacitor + Vue3 的 Android 用户端
  - 短剧列表、视频播放、高光互动、特效动画
  - App 内「设置」页：配置本机后端局域网地址（如 `http://192.168.1.100:8080`）
  - 已生成 Capacitor Android 工程（`frontend-mobile/android/`）
  - 支持 Android 模拟器地址 `http://10.0.2.2:8080`
- **`frontend-mobile/README.md`**：Android 打包、真机联调说明

### 调整

- **后端**：默认监听 `0.0.0.0:8080`，便于手机通过局域网访问本机服务
- **根目录 README**：补充 Android App 入口说明
- **`.gitignore`**：排除 `frontend-mobile` 构建产物与 Android Gradle 缓存

### 使用方式（不变）

- **管理端**：仍使用本机浏览器 `frontend` → http://localhost:5173/admin/login
- **用户端 App**：Android Studio 安装到手机，在设置页填写电脑 IP 后使用

### 依赖说明

- Android 打包需安装 [Android Studio](https://developer.android.com/studio)
- 已配置 Gradle 国内镜像（阿里云 Maven + 腾讯云 Gradle），缓解 `dl.google.com` 连接超时
- 若仍失败，可在 Android Studio → Settings → HTTP Proxy 配置本地代理
