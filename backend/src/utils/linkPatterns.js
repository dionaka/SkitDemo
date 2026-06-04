/**
 * 链接识别规则（参考 astrbot_plugin_link_resolver）
 * https://github.com/vacacia/astrbot_plugin_link_resolver
 */

const BILI_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?bilibili\.com\/video\/(?:BV[\w]+|av\d+)/i,
  /(?:https?:\/\/)?(?:www\.)?bilibili\.com\/bangumi\/play\/\w+/i,
  /(?:https?:\/\/)?b23\.tv\/\w+/i,
  /(?:https?:\/\/)?(?:www\.)?bilibili\.com\/s\/video\/\w+/i,
];

const DOUYIN_PATTERNS = [
  /(?:https?:\/\/)?(?:v|jx)\.douyin\.com\/[\w-]+/i,
  /(?:https?:\/\/)?(?:www\.)?douyin\.com\/(?:video|note)\/\d+/i,
  /(?:https?:\/\/)?(?:www\.)?iesdouyin\.com\/share\/(?:slides|video|note)\/\d+/i,
  /(?:https?:\/\/)?m\.douyin\.com\/share\/(?:slides|video|note)\/\d+/i,
  /(?:https?:\/\/)?jingxuan\.douyin\.com\/m\/(?:slides|video|note)\/\d+/i,
];

const XHS_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?xiaohongshu\.com\/(?:explore|discovery\/item)\/[\w]+/i,
  /(?:https?:\/\/)?xhslink\.com\/[\w/]+/i,
];

const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/gi;

const PLATFORM_LABELS = {
  bilibili: 'B站',
  douyin: '抖音',
  xiaohongshu: '小红书',
};

function normalizeUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function matchPlatform(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;
  if (BILI_PATTERNS.some((p) => p.test(normalized))) return 'bilibili';
  if (DOUYIN_PATTERNS.some((p) => p.test(normalized))) return 'douyin';
  if (XHS_PATTERNS.some((p) => p.test(normalized))) return 'xiaohongshu';
  return null;
}

function looksLikeBareUrl(text) {
  return /^https?:\/\//i.test(text)
    || /^[\w-]+\.(bilibili|douyin|xiaohongshu|iesdouyin|xhslink|b23)\./i.test(text);
}

function extractLinkFromText(text) {
  const raw = (text || '').trim();
  if (!raw) return null;

  const matches = raw.match(URL_IN_TEXT) || [];
  for (const m of matches) {
    const url = normalizeUrl(m.replace(/[.,;:!?)，。；：！？\]]+$/, ''));
    if (matchPlatform(url)) return url;
  }

  if (looksLikeBareUrl(raw)) {
    const direct = normalizeUrl(raw);
    if (matchPlatform(direct)) return direct;
  }

  return null;
}

module.exports = {
  PLATFORM_LABELS,
  normalizeUrl,
  matchPlatform,
  extractLinkFromText,
};
