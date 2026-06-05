const db = require('../db');
const danmakuService = require('./danmakuService');
const highlightService = require('./highlightService');
const aiModelService = require('./aiModelService');

const BUCKET_SECONDS = 5;
const MIN_DANMAKU_COUNT = 8;
const MIN_UNIQUE_USERS = 3;
const MERGE_WINDOW_SECONDS = 5;
const MAX_CLUSTERS_PER_RUN = 5;

function bucketKey(positionSeconds) {
  return Math.floor(Number(positionSeconds) / BUCKET_SECONDS) * BUCKET_SECONDS;
}

class DanmakuHighlightService {
  detectClusters(videoId) {
    danmakuService.countByVideo(videoId);
    const rows = db.prepare(`
      SELECT d.position_seconds, d.content, d.user_id
      FROM video_danmaku d
      WHERE d.video_id = ? AND d.status = 1
      ORDER BY d.position_seconds ASC
    `).all(videoId);

    const buckets = new Map();
    rows.forEach((row) => {
      const key = bucketKey(row.position_seconds);
      if (!buckets.has(key)) {
        buckets.set(key, {
          bucket_start: key,
          center_seconds: key + BUCKET_SECONDS / 2,
          count: 0,
          users: new Set(),
          samples: [],
        });
      }
      const bucket = buckets.get(key);
      bucket.count += 1;
      bucket.users.add(row.user_id);
      if (bucket.samples.length < 30) {
        bucket.samples.push(row.content);
      }
    });

    return [...buckets.values()]
      .filter((b) => b.count >= MIN_DANMAKU_COUNT && b.users.size >= MIN_UNIQUE_USERS)
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_CLUSTERS_PER_RUN)
      .map((b) => ({
        bucket_start: b.bucket_start,
        center_seconds: Math.floor(b.center_seconds),
        danmaku_count: b.count,
        unique_users: b.users.size,
        samples: b.samples,
      }));
  }

  findNearbyActiveHighlight(videoId, timestamp) {
    return db.prepare(`
      SELECT * FROM highlight
      WHERE video_id = ?
        AND status = 'active'
        AND merged_into_id IS NULL
        AND ABS(timestamp - ?) <= ?
      ORDER BY
        CASE source WHEN 'manual' THEN 0 WHEN 'danmaku' THEN 1 ELSE 2 END,
        id ASC
    `).get(videoId, timestamp, MERGE_WINDOW_SECONDS);
  }

  mergeOrCreate(videoId, candidate) {
    const nearby = this.findNearbyActiveHighlight(videoId, candidate.timestamp);

    if (nearby) {
      if (nearby.source === 'manual') {
        return { action: 'skipped_manual', highlight_id: nearby.id };
      }

      const updated = highlightService.update(nearby.id, {
        title: candidate.title,
        category: candidate.category,
        interaction_type: candidate.category,
        options: candidate.options,
        danmaku_density: candidate.danmaku_count,
        confidence: candidate.confidence,
        effect_key: candidate.category,
        source: nearby.source === 'ai_video' ? 'ai_video' : 'danmaku',
      });

      return { action: 'merged', highlight_id: nearby.id, highlight: updated };
    }

    const created = highlightService.create({
      video_id: videoId,
      timestamp: candidate.timestamp,
      title: candidate.title,
      category: candidate.category,
      interaction_type: candidate.category,
      options: candidate.options,
      effect_key: candidate.category,
      source: 'danmaku',
      status: 'active',
      danmaku_density: candidate.danmaku_count,
      confidence: candidate.confidence,
    });

    return { action: 'created', highlight_id: created.id, highlight: created };
  }

  async analyzeVideoFromDanmaku(videoId) {
    const clusters = this.detectClusters(videoId);
    if (!clusters.length) {
      return {
        clusters_found: 0,
        created: 0,
        merged: 0,
        skipped: 0,
        highlights: [],
        message: `暂无满足条件的弹幕热点（需 ≥${MIN_DANMAKU_COUNT} 条且 ≥${MIN_UNIQUE_USERS} 人）`,
      };
    }

    const aiResult = await aiModelService.analyzeDanmakuClusters(clusters);
    const results = [];
    let created = 0;
    let merged = 0;
    let skipped = 0;

    for (const item of aiResult.highlights) {
      const cluster = clusters.find((c) => Math.abs(c.center_seconds - item.timestamp) <= BUCKET_SECONDS)
        || clusters[0];
      const candidate = {
        timestamp: item.timestamp,
        title: item.title,
        category: item.category,
        options: item.options,
        danmaku_count: cluster?.danmaku_count || 0,
        confidence: item.confidence ?? 0.7,
      };

      const outcome = this.mergeOrCreate(videoId, candidate);
      results.push(outcome);
      if (outcome.action === 'created') created += 1;
      else if (outcome.action === 'merged') merged += 1;
      else skipped += 1;
    }

    return {
      clusters_found: clusters.length,
      created,
      merged,
      skipped,
      source: aiResult.source,
      clusters,
      highlights: results,
    };
  }

  getDensityPreview(videoId) {
    const clusters = this.detectClusters(videoId);
    return {
      video_id: Number(videoId),
      bucket_seconds: BUCKET_SECONDS,
      min_danmaku_count: MIN_DANMAKU_COUNT,
      min_unique_users: MIN_UNIQUE_USERS,
      clusters,
    };
  }
}

module.exports = new DanmakuHighlightService();
