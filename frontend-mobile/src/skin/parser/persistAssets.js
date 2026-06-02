/** 云端 skin_data 目标体积（需小于后端 body 限制） */
const CLOUD_BUDGET_BYTES = 85 * 1024;
const MAX_ICON_BYTES = 24 * 1024;
const MAX_NAV_BG_BYTES = 28 * 1024;

function isRemoteUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function isBlobUrl(url) {
  return typeof url === 'string' && url.startsWith('blob:');
}

function isDataUrl(url) {
  return typeof url === 'string' && url.startsWith('data:');
}

function dataUrlByteSize(dataUrl) {
  if (!isDataUrl(dataUrl)) return 0;
  const base64 = dataUrl.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

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

async function loadImageFromUrl(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return loadImageFromBlob(blob);
}

async function compressToDataUrl(source, maxWidth, quality, maxBytes) {
  try {
    const img = isDataUrl(source)
      ? await loadImageFromUrl(source)
      : isBlobUrl(source)
        ? await loadImageFromUrl(source)
        : null;
    if (!img) return '';

    let width = maxWidth;
    let q = quality;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const scale = Math.min(1, width / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', q);
      if (dataUrlByteSize(dataUrl) <= maxBytes) return dataUrl;
      width = Math.round(width * 0.75);
      q = Math.max(0.5, q - 0.08);
    }
    return '';
  } catch {
    return '';
  }
}

async function normalizeAsset(url, { maxWidth, quality, maxBytes }) {
  if (!url) return '';
  if (isRemoteUrl(url)) return url;
  if (isDataUrl(url)) {
    if (dataUrlByteSize(url) <= maxBytes) return url;
    return compressToDataUrl(url, maxWidth, quality, maxBytes);
  }
  if (isBlobUrl(url)) {
    return compressToDataUrl(url, maxWidth, quality, maxBytes);
  }
  return url;
}

function estimateThemeBytes(theme) {
  try {
    return new Blob([JSON.stringify(theme)]).size;
  } catch {
    return JSON.stringify(theme).length;
  }
}

async function shrinkHeavyBackgrounds(theme) {
  const next = { ...theme };
  next.topNav = { ...next.topNav };
  next.tabBar = { ...next.tabBar };
  next.pageBackground = { ...next.pageBackground };

  if (next.topNav.backgroundImage && !isRemoteUrl(next.topNav.backgroundImage)) {
    next.topNav.backgroundImage = '';
  }
  if (next.tabBar.backgroundImage && !isRemoteUrl(next.tabBar.backgroundImage)) {
    next.tabBar.backgroundImage = '';
  }
  if (next.pageBackground?.image && !isRemoteUrl(next.pageBackground.image)) {
    next.pageBackground.image = '';
  }
  if (next.preview && !isRemoteUrl(next.preview)) {
    next.preview = '';
  }
  return next;
}

/**
 * 压缩主题资源供云端存储：保留 https 链接，本地图压缩到小体积 data URL。
 */
export async function prepareThemeForCloud(theme) {
  if (!theme) return theme;
  const next = JSON.parse(JSON.stringify(theme));

  next.topNav = {
    ...next.topNav,
    backgroundImage: await normalizeAsset(next.topNav?.backgroundImage, {
      maxWidth: 720,
      quality: 0.68,
      maxBytes: MAX_NAV_BG_BYTES,
    }),
  };
  next.tabBar = {
    ...next.tabBar,
    backgroundImage: await normalizeAsset(next.tabBar?.backgroundImage, {
      maxWidth: 640,
      quality: 0.65,
      maxBytes: MAX_NAV_BG_BYTES,
    }),
  };
  next.preview = await normalizeAsset(next.preview, {
    maxWidth: 480,
    quality: 0.7,
    maxBytes: MAX_NAV_BG_BYTES,
  });
  next.pageBackground = {
    ...next.pageBackground,
    image: await normalizeAsset(next.pageBackground?.image, {
      maxWidth: 640,
      quality: 0.65,
      maxBytes: MAX_NAV_BG_BYTES,
    }),
  };
  next.refresh = {
    ...next.refresh,
    icon: await normalizeAsset(next.refresh?.icon, {
      maxWidth: 96,
      quality: 0.82,
      maxBytes: MAX_ICON_BYTES,
    }),
  };

  if (Array.isArray(next.tabBar?.tabs)) {
    next.tabBar.tabs = await Promise.all(next.tabBar.tabs.map(async (tab) => ({
      ...tab,
      icon: await normalizeAsset(tab.icon, {
        maxWidth: 80,
        quality: 0.82,
        maxBytes: MAX_ICON_BYTES,
      }),
      iconActive: await normalizeAsset(tab.iconActive, {
        maxWidth: 80,
        quality: 0.82,
        maxBytes: MAX_ICON_BYTES,
      }),
    })));
  }

  if (estimateThemeBytes(next) > CLOUD_BUDGET_BYTES) {
    return shrinkHeavyBackgrounds(next);
  }
  return next;
}

/** @deprecated 使用 prepareThemeForCloud */
export const persistThemeAssets = prepareThemeForCloud;
