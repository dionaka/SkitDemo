import { unzipSync } from 'fflate';

function decodeName(bytes) {
  try {
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return new TextDecoder().decode(bytes);
  }
}

function findJsonEntry(entries) {
  const names = Object.keys(entries);
  const priority = [
    /个性装扮\.json$/i,
    /[^/]+\.json$/i,
  ];
  for (const pattern of priority) {
    const hit = names.find((name) => pattern.test(name) && !name.startsWith('__MACOSX'));
    if (hit) return hit;
  }
  return names.find((name) => name.endsWith('.json') && !name.startsWith('__MACOSX')) || null;
}

function toBlobUrl(bytes, filename) {
  const lower = filename.toLowerCase();
  let mime = 'application/octet-stream';
  if (lower.endsWith('.png')) mime = 'image/png';
  else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
  else if (lower.endsWith('.webp')) mime = 'image/webp';
  else if (lower.endsWith('.gif')) mime = 'image/gif';
  const blob = new Blob([bytes], { type: mime });
  return URL.createObjectURL(blob);
}

/**
 * 解压 bilibili-skin zip，返回 JSON 与本地资源 blob URL 映射。
 */
export function extractSkinZip(buffer) {
  const archive = unzipSync(new Uint8Array(buffer));
  const jsonName = findJsonEntry(archive);
  if (!jsonName) throw new Error('压缩包中未找到主题 JSON');

  const jsonText = decodeName(archive[jsonName]);
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('主题 JSON 格式无效');
  }

  const assetMap = {};
  const blobUrls = [];

  Object.entries(archive).forEach(([entryName, bytes]) => {
    if (entryName === jsonName) return;
    if (entryName.startsWith('__MACOSX')) return;
    if (!/\.(png|jpe?g|webp|gif)$/i.test(entryName)) return;

    const base = entryName.split('/').pop().replace(/\.[^.]+$/, '');
    const url = toBlobUrl(bytes, entryName);
    blobUrls.push(url);

    const normalized = base.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    assetMap[normalized] = url;
    assetMap[base] = url;

    if (/head_tab/i.test(entryName)) assetMap.head_tab_bg = url;
    if (/head_bg/i.test(entryName) && !/tab|myself|squared/i.test(entryName)) assetMap.head_bg = url;
    if (/tail_bg/i.test(entryName)) assetMap.tail_bg = url;
    if (/tail_icon_main/i.test(entryName) && !/selected/i.test(entryName)) assetMap.tail_icon_main = url;
    if (/tail_icon_selected_main/i.test(entryName)) assetMap.tail_icon_selected_main = url;
    if (/tail_icon_myself/i.test(entryName) && !/selected/i.test(entryName)) assetMap.tail_icon_myself = url;
    if (/tail_icon_selected_myself/i.test(entryName)) assetMap.tail_icon_selected_myself = url;
    if (/side_bg/i.test(entryName) && !/bottom/i.test(entryName)) assetMap.side_bg = url;
    if (/preview/i.test(entryName)) assetMap.image_preview = url;
  });

  return { parsed, assetMap, blobUrls };
}

export function revokeBlobUrls(urls = []) {
  urls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  });
}
