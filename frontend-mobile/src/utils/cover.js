import { resolveMediaUrl } from '@/config/server';
import defaultCoverAsset from '@/assets/images/default-cover.svg';

export const DEFAULT_COVER_PATH = '/uploads/covers/default-cover.svg';

const PALETTES = [
  ['#ff6b6b', '#c44569'],
  ['#a29bfe', '#6c5ce7'],
  ['#fd79a8', '#e84393'],
  ['#00cec9', '#0984e3'],
  ['#fdcb6e', '#e17055'],
  ['#74b9ff', '#6c5ce7'],
  ['#ff9ff3', '#f368e0'],
  ['#48dbfb', '#0abde3'],
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function coverGradient(seed) {
  const p = PALETTES[hashCode(String(seed)) % PALETTES.length];
  return `linear-gradient(160deg, ${p[0]} 0%, ${p[1]} 100%)`;
}

export function coverInitial(title) {
  const t = (title || '').trim();
  return t ? t.charAt(0) : '剧';
}

export function isDefaultCoverUrl(url) {
  if (!url) return true;
  return /default-cover|demo-cover/i.test(url);
}

export function isRealCoverUrl(url) {
  return url && !isDefaultCoverUrl(url);
}

export function getBundledDefaultCover() {
  return defaultCoverAsset;
}

export function resolveRemoteCoverUrl(coverUrl) {
  if (!coverUrl || isDefaultCoverUrl(coverUrl)) return '';
  return resolveMediaUrl(coverUrl);
}

export function resolveCoverSrc(coverUrl) {
  const custom = resolveRemoteCoverUrl(coverUrl);
  if (custom) return custom;

  const serverDefault = resolveMediaUrl(DEFAULT_COVER_PATH);
  return serverDefault || getBundledDefaultCover();
}
