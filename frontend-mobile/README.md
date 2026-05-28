# 短剧互动 · Android 用户端

基于 Capacitor 的 Android App，仅包含用户端（短剧列表、播放、高光互动）。管理端仍使用本机 `frontend` 网页。

## 前置条件

- Node.js 18+
- 本机后端已启动：`cd backend && npm run dev`
- Android 开发（打包 APK）：安装 [Android Studio](https://developer.android.com/studio)

## 浏览器调试（可选）

```bash
cd frontend-mobile
npm install
npm run dev
```

访问 http://localhost:5174 ，API 通过 Vite 代理到 `localhost:8080`。

## 打包 Android App

### 1. 安装依赖并构建

```bash
cd frontend-mobile
npm install
npm run build
```

### 2. 初始化 Android 工程（首次）

```bash
npx cap add android
npx cap sync android
```

### 3. 用 Android Studio 打开并运行

```bash
npm run cap:android
```

在 Android Studio 中选择真机或模拟器，点击 Run 安装 App。

后续改代码后同步：

```bash
npm run cap:sync
```

## 手机连接本机后端

1. 电脑与手机连接**同一 WiFi**
2. 电脑 CMD 运行 `ipconfig`，记下 IPv4 地址（如 `192.168.1.100`）
3. Windows 防火墙放行 **8080** 端口
4. 本机启动后端：`cd backend && npm run dev`
5. 手机打开 App → 右上角 **设置** → 填写 `http://192.168.1.100:8080` → 保存并测试

| 环境 | 后端地址示例 |
|------|-------------|
| Android 真机 + 本机后端 | `http://192.168.x.x:8080` |
| Android 模拟器 + 本机后端 | `http://10.0.2.2:8080` |

## 与管理端配合使用

| 端 | 启动方式 |
|----|----------|
| 后端 | `cd backend && npm run dev` |
| 管理端网页 | `cd frontend && npm run dev` → http://localhost:5173/admin/login |
| 用户端 App | Android Studio 安装到手机 |

管理端上传、AI 分析、发布视频后，App 刷新列表即可看到。
