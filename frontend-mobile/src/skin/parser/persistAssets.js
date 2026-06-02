const MAX_ICON_BYTES = 150 * 1024;
const MAX_BG_BYTES = 680 * 1024;

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

async function compressBlobToDataUrl(blob, maxWidth = 1200, quality = 0.82) {
  const img = await loadImageFromBlob(blob);
  const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法压缩图片');
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

async function blobUrlToDataUrl(url, maxBytes = MAX_ICON_BYTES) {
  const response = await fetch(url);
  const blob = await response.blob();
  if (blob.size <= maxBytes) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('读取主题资源失败'));
      reader.readAsDataURL(blob);
    });
  }
  if (!blob.type.startsWith('image/')) return '';
  try {
    return await compressBlobToDataUrl(blob, 1200, 0.8);
  } catch {
    return '';
  }
}

function isBlobUrl(url) {
  return typeof url === 'string' && url.startsWith('blob:');
}

async function embedAsset(url, maxBytes = MAX_ICON_BYTES) {
  if (!url || !isBlobUrl(url)) return url;
  try {
    const dataUrl = await blobUrlToDataUrl(url, maxBytes);
    return dataUrl || url;
  } catch {
    return url;
  }
}

/**
 * 将 zip 解压得到的 blob URL 内联为 data URL，便于云端持久化。
 */
export async function persistThemeAssets(theme) {
  if (!theme) return theme;
  const next = JSON.parse(JSON.stringify(theme));

  next.topNav.backgroundImage = await embedAsset(next.topNav?.backgroundImage, MAX_BG_BYTES);
  next.tabBar.backgroundImage = await embedAsset(next.tabBar?.backgroundImage, MAX_BG_BYTES);
  next.preview = await embedAsset(next.preview, MAX_BG_BYTES);
  next.pageBackground.image = await embedAsset(next.pageBackground?.image, MAX_BG_BYTES);
  next.refresh.icon = await embedAsset(next.refresh?.icon, MAX_ICON_BYTES);

  if (Array.isArray(next.tabBar?.tabs)) {
    next.tabBar.tabs = await Promise.all(next.tabBar.tabs.map(async (tab) => ({
      ...tab,
      icon: await embedAsset(tab.icon, MAX_ICON_BYTES),
      iconActive: await embedAsset(tab.iconActive, MAX_ICON_BYTES),
    })));
  }

  return next;
}
