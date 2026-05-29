const db = require('../db');
const coverService = require('./coverService');
const videoService = require('./videoService');
const seriesService = require('./seriesService');

async function backfillMissingCovers() {
  const videos = db.prepare(`
    SELECT id, video_url, cover_url, series_id, episode_number FROM video
    WHERE cover_url IS NULL OR cover_url = ''
      OR cover_url LIKE '%default-cover%'
      OR cover_url LIKE '%demo-cover%'
  `).all();

  if (!videos.length) {
    console.log('[cover] 无需补生成封面');
    return;
  }

  console.log(`[cover] 正在为 ${videos.length} 个视频补生成封面（视频截图）...`);
  let updated = 0;

  for (const v of videos) {
    const newCover = await coverService.regenerateVideoCover(v);
    if (!newCover || coverService.isPlaceholderCover(newCover)) continue;
    if (newCover === v.cover_url) continue;

    videoService.updateCover(v.id, newCover);
    updated += 1;

    if (v.series_id && v.episode_number === 1) {
      seriesService.syncSeriesCover(v.series_id, newCover);
    }
  }

  const seriesRows = db.prepare('SELECT DISTINCT series_id as id FROM video WHERE series_id IS NOT NULL').all();
  seriesRows.forEach(({ id }) => seriesService.syncSeriesCover(id));

  console.log(`[cover] 封面补生成完成，更新 ${updated} 个视频`);
}

module.exports = { backfillMissingCovers };
