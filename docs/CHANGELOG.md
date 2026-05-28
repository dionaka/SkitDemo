# 更新日志

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
