#!/usr/bin/env bash
# 在 Linux 服务器安装 yt-dlp（链接解析上传依赖）
set -euo pipefail

INSTALL_DIR="${YT_DLP_INSTALL_DIR:-$(cd "$(dirname "$0")/.." && pwd)/bin}"
mkdir -p "$INSTALL_DIR"
TARGET="$INSTALL_DIR/yt-dlp"

echo "Installing yt-dlp to $TARGET ..."
curl -fsSL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" -o "$TARGET"
chmod a+rx "$TARGET"
"$TARGET" --version
echo "Done. Set YT_DLP_PATH=$TARGET in .env or export it before starting the backend."
