/**
 * B 站元数据兜底（yt-dlp 遇 412 时用于预览；下载仍依赖 yt-dlp + Cookie）
 */
const BROWSER_UA = (
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
);

function extractBvid(url) {
  const m = String(url || '').match(/(?:BV[\w]+|av\d+)/i);
  return m ? m[0] : null;
}

async function fetchView(bvid) {
  const api = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`;
  const res = await fetch(api, {
    headers: {
      'User-Agent': BROWSER_UA,
      Referer: 'https://www.bilibili.com/',
      Origin: 'https://www.bilibili.com',
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`B站 API HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.code !== 0 || !json.data) {
    throw new Error(json.message || `B站 API 错误 code=${json.code}`);
  }
  return json.data;
}

function normalizeRemoteMediaUrl(url) {
  if (!url) return null;
  let u = String(url).trim();
  if (u.startsWith('//')) u = `https:${u}`;
  if (u.startsWith('http://')) u = u.replace(/^http:\/\//i, 'https://');
  return u;
}

function mapViewToPreview(data, sourceUrl) {
  const duration = Math.round(Number(data.duration) || 0);
  return {
    platform: 'bilibili',
    platform_label: 'B站',
    source_url: sourceUrl,
    title: data.title || '未命名',
    author: data.owner?.name || '',
    duration_seconds: duration,
    thumbnail: normalizeRemoteMediaUrl(data.pic || null),
    filesize_bytes: null,
    is_video: duration > 0,
    extractor: 'bilibili-api-fallback',
  };
}

async function previewByApi(sourceUrl) {
  const bvid = extractBvid(sourceUrl);
  if (!bvid) throw new Error('无法从链接提取 BV 号');
  const data = await fetchView(bvid);
  return mapViewToPreview(data, sourceUrl);
}

module.exports = {
  BROWSER_UA,
  extractBvid,
  previewByApi,
};
