const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../config');
const branchService = require('./branchService');
const branchTtsService = require('./branchTtsService');
const { GENERATOR_IDS, ASSET_TYPES, NODE_TYPES } = require('./generators/types');

const BRANCH_ASSET_DIR = path.join(config.uploadBasePath, 'branches', 'demo');

function writeSvg(filename, svgContent) {
  fs.mkdirSync(BRANCH_ASSET_DIR, { recursive: true });
  const filePath = path.join(BRANCH_ASSET_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, svgContent, 'utf8');
  }
}

function ensureBranchAssets() {
  writeSvg('intro.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#16213e"/></linearGradient></defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <text x="640" y="300" fill="#fff" font-size="48" text-anchor="middle" font-family="sans-serif">追兵逼近 · 分叉路口</text>
  <text x="640" y="380" fill="#e94560" font-size="28" text-anchor="middle" font-family="sans-serif">预生成剧情分支 Demo</text>
  <text x="640" y="460" fill="#aaa" font-size="22" text-anchor="middle" font-family="sans-serif">播放后将出现两个选项，体验不同分支结局</text>
</svg>`);

  writeSvg('escape.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0f2027"/><stop offset="100%" stop-color="#203a43"/></linearGradient></defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect x="180" y="420" width="920" height="80" rx="12" fill="#333"/>
  <rect x="520" y="360" width="280" height="100" rx="16" fill="#e94560"/>
  <circle cx="560" cy="410" r="28" fill="#222"/>
  <circle cx="760" cy="410" r="28" fill="#222"/>
  <text x="640" y="260" fill="#fff" font-size="42" text-anchor="middle" font-family="sans-serif">【分支 A】踩油门逃离</text>
  <text x="640" y="330" fill="#ffd32a" font-size="24" text-anchor="middle" font-family="sans-serif">预生成插入片段 · 加速包画面</text>
</svg>`);

  writeSvg('fight.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#2c003e"/><stop offset="100%" stop-color="#4a0011"/></linearGradient></defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <circle cx="420" cy="380" r="90" fill="#e94560" opacity="0.85"/>
  <circle cx="860" cy="380" r="90" fill="#5352ed" opacity="0.85"/>
  <text x="640" y="260" fill="#fff" font-size="42" text-anchor="middle" font-family="sans-serif">【分支 B】下车硬刚</text>
  <text x="640" y="330" fill="#ff6b81" font-size="24" text-anchor="middle" font-family="sans-serif">预生成插入片段 · 对峙名场面</text>
</svg>`);

  writeSvg('ending-escape.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#0d1b2a"/>
  <text x="640" y="320" fill="#4cd137" font-size="44" text-anchor="middle" font-family="sans-serif">成功脱身！</text>
  <text x="640" y="390" fill="#ccc" font-size="24" text-anchor="middle" font-family="sans-serif">你选择了加速逃离，甩开了追兵</text>
  <text x="640" y="450" fill="#888" font-size="20" text-anchor="middle" font-family="sans-serif">（预生成分支结局 · 可替换为 TTS 旁白 + 合成视频）</text>
</svg>`);

  writeSvg('ending-fight.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#1a1a2e"/>
  <text x="640" y="320" fill="#ffa502" font-size="44" text-anchor="middle" font-family="sans-serif">正面对决！</text>
  <text x="640" y="390" fill="#ccc" font-size="24" text-anchor="middle" font-family="sans-serif">你选择了下车硬刚，场面一触即发</text>
  <text x="640" y="450" fill="#888" font-size="20" text-anchor="middle" font-family="sans-serif">（预生成分支结局 · 可替换为 TTS 旁白 + 合成视频）</text>
</svg>`);
}

function assetUrl(filename) {
  return `/uploads/branches/demo/${filename}`;
}

function spec(type, payload) {
  return JSON.stringify({ generator: GENERATOR_IDS.STATIC, type, ...payload });
}

function specTts(payload) {
  return JSON.stringify({ generator: GENERATOR_IDS.TTS, type: ASSET_TYPES.COMPOSITE, ...payload });
}

function specVideoSynth(payload) {
  return JSON.stringify({ generator: GENERATOR_IDS.VIDEO_SYNTH, type: ASSET_TYPES.VIDEO, ...payload });
}

function findSourceVideoUrl() {
  const row = db.prepare(`
    SELECT video_url FROM video WHERE status = 1 ORDER BY id ASC LIMIT 1
  `).get();
  return row?.video_url || '/uploads/videos/demo.mp4';
}

function upgradeBranchDemoIfNeeded() {
  const demo = db.prepare('SELECT * FROM branch_demo ORDER BY id ASC LIMIT 1').get();
  if (!demo) return;

  const root = db.prepare('SELECT * FROM branch_node WHERE id = ?').get(demo.root_node_id);
  if (!root) return;

  const rootSpec = JSON.parse(root.asset_spec);
  if (rootSpec.generator !== GENERATOR_IDS.VIDEO_SYNTH || !rootSpec.fallback_image_url) {
    const sourceVideoUrl = findSourceVideoUrl();
    db.prepare('UPDATE branch_node SET asset_spec = ?, branch_at = ? WHERE id = ?').run(
      specVideoSynth({
        source_video_url: sourceVideoUrl,
        start_at: 0,
        end_at: 12,
        fallback_image_url: assetUrl('intro.svg'),
        caption: '追兵逼近，前方出现分叉路口…',
        subtitle: 'video_synth · ffmpeg 切片',
      }),
      12,
      root.id,
    );
    console.log('[branch] 已升级根节点为 video_synth');
  }

  const upgrades = [
    {
      label: '加速逃离片段',
      spec: specTts({
        text: '你猛踩油门，引擎轰鸣，预生成的加速包画面插入，后方追兵被远远甩开！',
        image_url: assetUrl('escape.svg'),
        voice: 'default',
        provider: 'windows_sapi',
        duration: 7,
      }),
    },
    {
      label: '下车硬刚片段',
      spec: specTts({
        text: '你推开车门正面迎战，预生成的对峙名场面插入，空气瞬间凝固！',
        image_url: assetUrl('fight.svg'),
        voice: 'default',
        provider: 'windows_sapi',
        duration: 7,
      }),
    },
    {
      label: '逃离结局',
      spec: specTts({
        text: '成功脱身！你选择了加速逃离，甩开了追兵，这条分支体验结束。',
        image_url: assetUrl('ending-escape.svg'),
        voice: 'default',
        provider: 'windows_sapi',
        duration: 6,
      }),
    },
    {
      label: '硬刚结局',
      spec: specTts({
        text: '正面对决！你选择了下车硬刚，场面一触即发，这条分支体验结束。',
        image_url: assetUrl('ending-fight.svg'),
        voice: 'default',
        provider: 'windows_sapi',
        duration: 6,
      }),
    },
  ];

  upgrades.forEach(({ label, spec: nodeSpec }) => {
    const node = db.prepare('SELECT * FROM branch_node WHERE demo_id = ? AND label = ?').get(demo.id, label);
    if (!node) return;
    const current = JSON.parse(node.asset_spec);
    if (current.generator === GENERATOR_IDS.TTS && current.text) return;
    db.prepare('UPDATE branch_node SET asset_spec = ? WHERE id = ?').run(nodeSpec, node.id);
  });

  db.prepare('UPDATE branch_demo SET description = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
    '演示「主线切片 → 分叉选择 → TTS 旁白 + 预生成画面 → 结局」完整链路。支持 static / tts / video_synth 三种生成器。',
    demo.id,
  );
}

async function prewarmBranchDemo() {
  const demo = db.prepare('SELECT id FROM branch_demo ORDER BY id ASC LIMIT 1').get();
  if (!demo) return;
  upgradeBranchDemoIfNeeded();
  await branchService.prewarmDemoAssets(demo.id);
}

function seedBranchDemoIfNeeded() {
  ensureBranchAssets();
  branchService.ensureAssetDirs();

  const existing = db.prepare('SELECT id FROM branch_demo LIMIT 1').get();
  if (existing) return;

  const series = db.prepare('SELECT id FROM series ORDER BY id ASC LIMIT 1').get();
  const seriesId = series?.id || null;

  const demoId = db.prepare(`
    INSERT INTO branch_demo (title, description, series_id, status)
    VALUES (?, ?, ?, 1)
  `).run(
    '追车分叉 · 预生成 Demo',
    '演示「高光剧情 → 用户选择 → 播放预生成分支片段 → 结局」完整链路。资源由 static 生成器提供，后续可接入 TTS / 视频合成。',
    seriesId,
  ).lastInsertRowid;

  const insertNode = db.prepare(`
    INSERT INTO branch_node (demo_id, label, node_type, asset_spec, branch_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  // 根节点：优先 video_synth 切片，无视频时 seed 仍写 composite
  const sourceVideoUrl = findSourceVideoUrl();
  const rootId = insertNode.run(
    demoId,
    '主线引入',
    NODE_TYPES.SEGMENT,
    specVideoSynth({
      source_video_url: sourceVideoUrl,
      start_at: 0,
      end_at: 12,
      fallback_image_url: assetUrl('intro.svg'),
      caption: '追兵逼近，前方出现分叉路口…',
      subtitle: 'video_synth · ffmpeg 切片',
    }),
    12,
  ).lastInsertRowid;

  const escapeClipId = insertNode.run(
    demoId,
    '加速逃离片段',
    NODE_TYPES.SEGMENT,
    specTts({
      text: '你猛踩油门，引擎轰鸣，预生成的加速包画面插入，后方追兵被远远甩开！',
      image_url: assetUrl('escape.svg'),
      voice: 'default',
      provider: 'windows_sapi',
      duration: 7,
    }),
    null,
  ).lastInsertRowid;

  const fightClipId = insertNode.run(
    demoId,
    '下车硬刚片段',
    NODE_TYPES.SEGMENT,
    specTts({
      text: '你推开车门正面迎战，预生成的对峙名场面插入，空气瞬间凝固！',
      image_url: assetUrl('fight.svg'),
      voice: 'default',
      provider: 'windows_sapi',
      duration: 7,
    }),
    null,
  ).lastInsertRowid;

  const escapeEndId = insertNode.run(
    demoId,
    '逃离结局',
    NODE_TYPES.ENDING,
    specTts({
      text: '成功脱身！你选择了加速逃离，甩开了追兵，这条分支体验结束。',
      image_url: assetUrl('ending-escape.svg'),
      voice: 'default',
      provider: 'windows_sapi',
      duration: 6,
    }),
    null,
  ).lastInsertRowid;

  const fightEndId = insertNode.run(
    demoId,
    '硬刚结局',
    NODE_TYPES.ENDING,
    specTts({
      text: '正面对决！你选择了下车硬刚，场面一触即发，这条分支体验结束。',
      image_url: assetUrl('ending-fight.svg'),
      voice: 'default',
      provider: 'windows_sapi',
      duration: 6,
    }),
    null,
  ).lastInsertRowid;

  const insertChoice = db.prepare(`
    INSERT INTO branch_choice (demo_id, from_node_id, option_label, option_desc, to_node_id, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertChoice.run(demoId, rootId, '踩油门逃离', '插入预生成加速画面', escapeClipId, 0);
  insertChoice.run(demoId, rootId, '下车硬刚', '插入预生成对峙场面', fightClipId, 1);
  insertChoice.run(demoId, escapeClipId, '继续', '进入结局', escapeEndId, 0);
  insertChoice.run(demoId, fightClipId, '继续', '进入结局', fightEndId, 0);

  db.prepare('UPDATE branch_demo SET root_node_id = ? WHERE id = ?').run(rootId, demoId);

  console.log('[branch] 已种子预生成分支 Demo, id =', demoId);
}

module.exports = { seedBranchDemoIfNeeded, ensureBranchAssets, upgradeBranchDemoIfNeeded, prewarmBranchDemo };
