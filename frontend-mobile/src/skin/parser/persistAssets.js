const MAX_EMBED_BYTES = 120 * 1024;

async function blobUrlToDataUrl(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  if (blob.size > MAX_EMBED_BYTES) return '';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取主题资源失败'));
    reader.readAsDataURL(blob);
  });
}

function isBlobUrl(url) {
  return typeof url === 'string' && url.startsWith('blob:');
}

async function embedAsset(url) {
  if (!url || !isBlobUrl(url)) return url;
  try {
    const dataUrl = await blobUrlToDataUrl(url);
    return dataUrl || '';
  } catch {
    return '';
  }
}

/**
 * 将 zip 解压得到的 blob URL 内联为小体积 data URL，便于云端持久化。
 */
export async function persistThemeAssets(theme) {
  if (!theme) return theme;
  const next = JSON.parse(JSON.stringify(theme));

  next.topNav.backgroundImage = await embedAsset(next.topNav?.backgroundImage);
  next.tabBar.backgroundImage = await embedAsset(next.tabBar?.backgroundImage);
  next.preview = await embedAsset(next.preview);
  next.pageBackground.image = await embedAsset(next.pageBackground?.image);
  next.refresh.icon = await embedAsset(next.refresh?.icon);

  if (Array.isArray(next.tabBar?.tabs)) {
    next.tabBar.tabs = await Promise.all(next.tabBar.tabs.map(async (tab) => ({
      ...tab,
      icon: await embedAsset(tab.icon),
      iconActive: await embedAsset(tab.iconActive),
    })));
  }

  return next;
}
