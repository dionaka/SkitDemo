# ECS 云服务器更新指南

国内 ECS 通常无法直连 GitHub，且**只 pull 代码不够**，必须重装依赖、重新构建前端、重启后端。

## 1. 拉取最新代码

```bash
cd ~/SkitDemo

git remote set-url origin https://gitclone.com/github.com/dionaka/SkitDemo.git
git pull origin main

git log -1 --oneline
```

## 2. 更新后端（含视频截帧封面）

```bash
cd ~/SkitDemo/backend
npm install
# 若 npm 安装 ffmpeg-static 较慢，可改用系统 ffmpeg：
# sudo apt update && sudo apt install -y ffmpeg
pm2 restart skitdemo
```

重启后日志应出现：

```
[cover] 正在为 N 个视频补生成封面（视频截图）...
[cover] 封面补生成完成，更新 X 个视频
```

验证：

```bash
curl -I http://127.0.0.1:8080/uploads/covers/default-cover.svg
ls ~/SkitDemo/uploads/covers/
```

## 3. 重新构建 Web 前端

```bash
cd ~/SkitDemo/frontend
npm install
npm run build
```

浏览器强制刷新（Ctrl+F5）。

## 4. 手机 App

需在本地重新 `npm run cap:sync` 并安装 APK。

## 5. 管理后台封面功能

- 上传视频时可选手动上传封面；不选则自动从视频截帧
- 编辑对话框可上传封面，勾选「同时设为该剧集海报」
- 「重截封面」从视频重新生成截图
