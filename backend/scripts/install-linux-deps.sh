#!/usr/bin/env bash
# Linux 服务器一键安装运行时依赖（避免 npm 下载 ffmpeg-static 卡住）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> 安装系统 ffmpeg ..."
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y ffmpeg curl python3 build-essential
elif command -v yum >/dev/null 2>&1; then
  sudo yum install -y ffmpeg curl python3 gcc-c++ make || {
    echo "yum 无 ffmpeg 包时请先启用 EPEL / rpmfusion 后重试"
    exit 1
  }
else
  echo "请手动安装 ffmpeg 与 curl"
  exit 1
fi

echo "==> 安装 yt-dlp ..."
bash "$ROOT/scripts/install-yt-dlp.sh"

echo "==> npm install ..."
npm install

echo "==> 验证 ..."
ffmpeg -version | head -1
"$ROOT/bin/yt-dlp" --version

echo ""
echo "完成。启动后端: cd $ROOT && npm start"
