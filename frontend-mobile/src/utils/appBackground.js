import { resolveMediaUrl } from '@/config/server';

const LEGACY_META_KEY = 'skitdemo_app_background';
const LEGACY_IMAGE_KEY = 'skitdemo_app_background_image';
const MAX_IMAGE_BYTES = 900 * 1024;

export const BACKGROUND_DEFAULTS = {
  backgroundUrl: '',
  overlayOpacity: 55,
  blur: 0,
};

export function clearLegacyBackgroundStorage() {
  localStorage.removeItem(LEGACY_META_KEY);
  localStorage.removeItem(LEGACY_IMAGE_KEY);
}

export function normalizeBackgroundPayload(data = {}) {
  return {
    backgroundUrl: data.background_url || '',
    overlayOpacity: Math.max(0, Math.min(85, Number(data.overlay_opacity ?? BACKGROUND_DEFAULTS.overlayOpacity))),
    blur: Math.max(0, Math.min(24, Number(data.blur ?? BACKGROUND_DEFAULTS.blur))),
  };
}

export function isBackgroundActive(state = BACKGROUND_DEFAULTS) {
  return Boolean(state.backgroundUrl);
}

export function resolveBackgroundImageUrl(backgroundUrl) {
  return resolveMediaUrl(backgroundUrl);
}

export function getBackgroundLayerStyle(state = BACKGROUND_DEFAULTS) {
  const imageUrl = resolveBackgroundImageUrl(state.backgroundUrl);
  return {
    backgroundImage: imageUrl ? `url("${imageUrl}")` : 'none',
    backgroundColor: '#07070d',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    filter: state.blur > 0 ? `blur(${state.blur}px)` : 'none',
    transform: state.blur > 0 ? 'scale(1.06)' : 'none',
  };
}

export function getBackgroundScrimStyle(state = BACKGROUND_DEFAULTS) {
  const opacity = Math.max(0, Math.min(85, Number(state.overlayOpacity) || 0)) / 100;
  return {
    background: `rgba(7, 7, 13, ${opacity})`,
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片格式无效'));
    img.src = dataUrl;
  });
}

function compressImage(dataUrl, maxWidth = 1080, quality = 0.82) {
  return loadImage(dataUrl).then((img) => {
    const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法处理图片');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  });
}

function estimateDataUrlBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

function dataUrlToFile(dataUrl, filename = 'background.jpg') {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

export async function processBackgroundImageFile(file) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('请选择图片文件');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('图片过大，请选择 12MB 以内的图片');
  }

  const raw = await readFileAsDataUrl(file);
  let compressed = await compressImage(raw);

  if (estimateDataUrlBytes(compressed) > MAX_IMAGE_BYTES) {
    compressed = await compressImage(raw, 900, 0.72);
  }
  if (estimateDataUrlBytes(compressed) > MAX_IMAGE_BYTES) {
    compressed = await compressImage(raw, 720, 0.65);
  }
  if (estimateDataUrlBytes(compressed) > MAX_IMAGE_BYTES) {
    throw new Error('图片压缩后仍过大，请换一张更小的图片');
  }

  return dataUrlToFile(compressed);
}

export function applyBackgroundDocumentClass(active) {
  document.documentElement.classList.toggle('custom-bg-active', Boolean(active));
}
