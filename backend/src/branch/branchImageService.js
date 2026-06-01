const fs = require('fs');
const path = require('path');
const secretsService = require('../services/secretsService');
const branchAssetService = require('./branchAssetService');
const branchFrameService = require('./branchFrameService');
const { buildBranchImagePrompt } = require('./branchImagePrompts');
const { toAbsoluteUploadPath, toPublicUploadUrl } = require('./utils/paths');
const { DEFAULT_FALLBACK_IMAGE } = require('./branchGenerationOptions');
const { explainImageApiError } = require('./branchImageErrors');

async function downloadToLocal(url, outputPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`下载图片失败 HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  return toPublicUploadUrl(outputPath);
}

function fileToBase64DataUrl(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).slice(1).toLowerCase() || 'jpeg';
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  const b64 = fs.readFileSync(filePath).toString('base64');
  return `data:image/${mime};base64,${b64}`;
}

async function generateDoubaoImage(prompt, { referenceFramePath, overrideCreds } = {}) {
  const creds = overrideCreds || secretsService.getImageCredentials();
  if (!creds?.apiKey || !creds?.model) {
    throw new Error('未配置豆包图生图接入点（API 配置 → 图生图 Endpoint ID，ep- 开头）');
  }

  const baseUrl = creds.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3';
  const body = {
    model: creds.model,
    prompt,
    size: creds.size || '2K',
    response_format: 'url',
    watermark: false,
    sequential_image_generation: 'disabled',
    stream: false,
  };

  const refDataUrl = referenceFramePath ? fileToBase64DataUrl(referenceFramePath) : null;
  if (refDataUrl) {
    body.image = refDataUrl;
  }

  const res = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const raw = data.error?.message || data.message || `图生图失败 (${res.status})`;
    console.warn(`[branch-image] 图生图 API 失败 endpoint=${creds.model} size=${body.size}:`, raw);
    throw new Error(explainImageApiError(raw));
  }

  const imageUrl = data.data?.[0]?.url || data.data?.url;
  if (!imageUrl) {
    throw new Error('图生图返回无图片 URL');
  }
  return { imageUrl, mode: refDataUrl ? 'i2i' : 't2i' };
}

/**
 * 按分支上下文：截主视频帧 → Seedream 图生图
 */
async function ensureImage(context = {}) {
  const {
    image_api: imageApi = 'doubao_i2i',
    image_url: presetUrl,
    image_prompt: presetPrompt,
    drama_genre: dramaGenre = 'auto',
    series_title: seriesTitle = '',
    video_title: videoTitle = '',
    branch_title: branchTitle = '',
    option_label: optionLabel = '',
    option_desc: optionDesc = '',
    narration = '',
    text = '',
    source_video_url: sourceVideoUrl,
    reference_timestamp: referenceTimestamp,
    reference_frame_url: cachedFrameUrl,
  } = context;

  const api = imageApi === 'doubao_ai' ? 'doubao_i2i' : imageApi;

  if (api === 'manual' && presetUrl) {
    return { image_url: presetUrl, source: 'manual' };
  }

  if (api === 'placeholder' || api === 'none') {
    return { image_url: presetUrl || DEFAULT_FALLBACK_IMAGE, source: 'placeholder' };
  }

  if (api !== 'doubao_i2i') {
    return { image_url: presetUrl || DEFAULT_FALLBACK_IMAGE, source: 'fallback' };
  }

  let referenceFrame = null;
  if (sourceVideoUrl) {
    referenceFrame = await branchFrameService.ensureReferenceFrame({
      sourceVideoUrl,
      timestamp: referenceTimestamp,
    });
  }

  const hasReferenceFrame = !!referenceFrame?.frame_path;
  const { prompt, genre_label: genreLabel, mode: promptMode } = buildBranchImagePrompt({
    dramaGenre,
    seriesTitle,
    videoTitle,
    branchTitle,
    optionLabel,
    optionDesc,
    narration: narration || text,
    imagePrompt: presetPrompt,
    hasReferenceFrame,
  });

  const cacheKey = branchAssetService.hashKey([
    'img',
    promptMode,
    referenceFrame?.frame_url || cachedFrameUrl || 'no-ref',
    dramaGenre,
    prompt,
  ]);
  const outputPath = branchAssetService.generatedImagePath(cacheKey, '.png');

  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    return {
      image_url: toPublicUploadUrl(outputPath),
      source: 'doubao_i2i_cached',
      image_prompt: prompt,
      genre_label: genreLabel,
      image_mode: promptMode,
      reference_frame_url: referenceFrame?.frame_url || cachedFrameUrl || null,
    };
  }

  try {
    const { imageUrl, mode } = await generateDoubaoImage(prompt, {
      referenceFramePath: referenceFrame?.frame_path,
    });
    const localUrl = await downloadToLocal(imageUrl, outputPath);
    return {
      image_url: localUrl,
      source: 'doubao_i2i',
      image_prompt: prompt,
      genre_label: genreLabel,
      image_mode: mode,
      reference_frame_url: referenceFrame?.frame_url || null,
    };
  } catch (err) {
    console.warn('[branch-image] 图生图失败，使用占位图:', err.message);
    return {
      image_url: presetUrl || DEFAULT_FALLBACK_IMAGE,
      source: 'error_fallback',
      image_prompt: prompt,
      error: err.message,
      reference_frame_url: referenceFrame?.frame_url || null,
    };
  }
}

async function testConnection(overrideCreds) {
  const creds = overrideCreds || secretsService.getImageCredentials();
  if (!creds?.apiKey || !creds?.model) {
    throw new Error('请先配置 API Key 与图生图 Endpoint ID（ep- 开头）');
  }
  await generateDoubaoImage(
    '短剧风格测试，基于参考图保持人物与场景一致，生成下一瞬间画面',
    { overrideCreds: creds },
  );
  return true;
}

module.exports = {
  ensureImage,
  testConnection,
  buildBranchImagePrompt,
};
