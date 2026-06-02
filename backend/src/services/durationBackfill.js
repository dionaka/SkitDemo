const db = require('../db');
const config = require('../config');
const { probeVideoDuration } = require('../utils/videoProbe');
const videoService = require('./videoService');

function toAbsoluteUploadPath(relativeUrl) {
  if (!relativeUrl?.startsWith('/uploads/')) return null;
  return require('path').join(config.uploadBasePath, relativeUrl.replace(/^\/uploads\//, ''));
}

async function backfillVideoDurations() {
  const rows = db.prepare(`
    SELECT id, video_url, total_duration FROM video
    WHERE video_url IS NOT NULL AND video_url != ''
  `).all();

  let updated = 0;
  for (const row of rows) {
    const abs = toAbsoluteUploadPath(row.video_url);
    if (!abs) continue;

    const probed = await probeVideoDuration(abs);
    if (!probed || probed < 1) continue;

    const stored = Number(row.total_duration) || 0;
    if (Math.abs(probed - stored) <= 2) continue;

    videoService.updateDuration(row.id, probed, { clampProgress: true });
    updated += 1;
  }

  if (updated > 0) {
    console.log(`[duration] 已自动修正 ${updated} 个视频时长`);
  }
}

module.exports = { backfillVideoDurations };
