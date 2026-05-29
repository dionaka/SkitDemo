# 更新日志

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
