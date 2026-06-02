const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../config');
const { probeVideoDuration, getFfmpegBins } = require('../utils/videoProbe');
const videoService = require('./videoService');

function toAbsoluteUploadPath(relativeUrl) {
  if (!relativeUrl?.startsWith('/uploads/')) return null;
  return path.join(config.uploadBasePath, relativeUrl.replace(/^\/uploads\//, ''));
}

async function backfillVideoDurations(options = {}) {
  const { forceLog = false } = options;
  const rows = db.prepare(`
    SELECT id, title, video_url, total_duration FROM video
    WHERE video_url IS NOT NULL AND video_url != ''
  `).all();

  if (!rows.length) {
    console.log('[duration] 数据库中暂无视频，跳过时长修正');
    return { scanned: 0, updated: 0, missing: 0, probeFailed: 0, unchanged: 0 };
  }

  const bins = getFfmpegBins();
  if (!bins.length) {
    console.warn('[duration] 未找到 ffmpeg，无法自动检测视频时长（请安装 ffmpeg 或 npm install ffmpeg-static）');
    return { scanned: rows.length, updated: 0, missing: 0, probeFailed: rows.length, unchanged: 0 };
  }

  console.log(`[duration] 正在扫描 ${rows.length} 个视频时长（ffmpeg: ${bins[0]}）...`);

  let updated = 0;
  let missing = 0;
  let probeFailed = 0;
  let unchanged = 0;

  for (const row of rows) {
    const abs = toAbsoluteUploadPath(row.video_url);
    if (!abs || !fs.existsSync(abs)) {
      missing += 1;
      continue;
    }

    const probed = await probeVideoDuration(abs);
    if (!probed || probed < 1) {
      probeFailed += 1;
      continue;
    }

    const stored = Number(row.total_duration) || 0;
    if (Math.abs(probed - stored) <= 2) {
      unchanged += 1;
      continue;
    }

    videoService.updateDuration(row.id, probed, { clampProgress: true });
    updated += 1;
    console.log(`[duration] #${row.id} ${row.title || '未命名'}: ${stored}s -> ${probed}s`);
  }

  if (updated > 0) {
    console.log(`[duration] 时长修正完成，更新 ${updated} 个视频`);
  } else {
    console.log('[duration] 无需修正时长（均已匹配或无法探测）');
  }

  if (missing > 0) {
    console.warn(`[duration] ${missing} 个视频文件不存在，路径基准: ${config.uploadBasePath}`);
  }
  if (probeFailed > 0) {
    console.warn(`[duration] ${probeFailed} 个视频 ffmpeg 探测失败`);
  }
  if (forceLog && unchanged > 0) {
    console.log(`[duration] ${unchanged} 个视频时长已正确`);
  }

  return { scanned: rows.length, updated, missing, probeFailed, unchanged };
}

module.exports = { backfillVideoDurations };
