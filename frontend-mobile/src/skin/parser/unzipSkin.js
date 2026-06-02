import { unzipSync } from 'fflate';

function decodeName(bytes) {
  try {
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return new TextDecoder().decode(bytes);
  }
}

function unwrapProperties(parsed) {
  if (parsed?.data?.properties) return parsed.data.properties;
  if (parsed?.properties) return parsed.properties;
  if (parsed?.data && typeof parsed.data === 'object') return parsed.data;
  return {};
}

function mergeZipJsonPayload(archive) {
  const jsonNames = Object.keys(archive).filter(
    (name) => name.endsWith('.json') && !name.startsWith('__MACOSX'),
  );

  let properties = {};
  let meta = {};

  const ordered = [
    ...jsonNames.filter((n) => /个性装扮\.json$/i.test(n)),
    ...jsonNames.filter((n) => !/个性装扮\.json$/i.test(n)),
  ];

  ordered.forEach((name) => {
    try {
      const parsed = JSON.parse(decodeName(archive[name]));
      const props = unwrapProperties(parsed);
      if (props && typeof props === 'object') {
        properties = { ...properties, ...props };
      }
      if (parsed?.data?.name || parsed?.name) meta.name = parsed.data?.name || parsed.name;
      if (parsed?.data?.item_id || parsed?.id) meta.item_id = parsed.data?.item_id || parsed.id;
      if (parsed?.preview) meta.preview = parsed.preview;
      if (parsed?.package_url) meta.package_url = parsed.package_url;
    } catch { /* skip invalid json */ }
  });

  return { properties, ...meta };
}

function findJsonEntry(entries) {
  const names = Object.keys(entries);
  const hit = names.find((name) => /个性装扮\.json$/i.test(name) && !name.startsWith('__MACOSX'));
  if (hit) return hit;
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

function mapAssetsFromProperties(properties, archive) {
  const assetMap = {};
  const entryNames = Object.keys(archive);

  Object.entries(properties || {}).forEach(([key, value]) => {
    if (typeof value !== 'string' || !value.includes('/')) return;
    const filename = value.split('/').pop()?.split('?')[0] || '';
    if (!filename || filename.length < 8) return;

    const hit = entryNames.find(
      (entry) => entry.endsWith(filename)
        || entry.includes(filename.slice(0, 20)),
    );
    if (hit) assetMap[key] = toBlobUrl(archive[hit], hit);
  });

  return assetMap;
}

function mapAssetsByFilename(archive) {
  const assetMap = {};
  const blobUrls = [];

  Object.entries(archive).forEach(([entryName, bytes]) => {
    if (entryName.startsWith('__MACOSX')) return;
    if (!/\.(png|jpe?g|webp|gif)$/i.test(entryName)) return;

    const base = entryName.split('/').pop().replace(/\.[^.]+$/, '');
    const url = toBlobUrl(bytes, entryName);
    blobUrls.push(url);

    assetMap[base] = url;

    if (/head_tab/i.test(entryName)) assetMap.head_tab_bg = url;
    if (/head_bg/i.test(entryName) && !/tab|myself|squared/i.test(entryName)) assetMap.head_bg = url;
    if (/head_myself_bg/i.test(entryName) && !/squared/i.test(entryName)) assetMap.head_myself_bg = url;
    if (/tail_bg/i.test(entryName)) assetMap.tail_bg = url;
    if (/tail_icon_main/i.test(entryName) && !/selected/i.test(entryName)) assetMap.tail_icon_main = url;
    if (/tail_icon_selected_main/i.test(entryName)) assetMap.tail_icon_selected_main = url;
    if (/tail_icon_myself/i.test(entryName) && !/selected/i.test(entryName)) assetMap.tail_icon_myself = url;
    if (/tail_icon_selected_myself/i.test(entryName)) assetMap.tail_icon_selected_myself = url;
    if (/side_bg/i.test(entryName) && !/bottom/i.test(entryName)) assetMap.side_bg = url;
    if (/preview/i.test(entryName)) assetMap.image_preview = url;
  });

  return { assetMap, blobUrls };
}

/**
 * 解压 bilibili-skin zip，返回 JSON 与本地资源 blob URL 映射。
 */
export function extractSkinZip(buffer) {
  const archive = unzipSync(new Uint8Array(buffer));
  const jsonName = findJsonEntry(archive);
  if (!jsonName) throw new Error('压缩包中未找到主题 JSON');

  const merged = mergeZipJsonPayload(archive);
  const parsed = {
    name: merged.name,
    item_id: merged.item_id,
    preview: merged.preview,
    package_url: merged.package_url,
    properties: merged.properties,
  };

  const fromNames = mapAssetsByFilename(archive);
  const fromProps = mapAssetsFromProperties(merged.properties, archive);
  const assetMap = { ...fromNames.assetMap, ...fromProps };
  const blobUrls = [...new Set([...fromNames.blobUrls, ...Object.values(fromProps)])];

  return { parsed, assetMap, blobUrls };
}

export function revokeBlobUrls(urls = []) {
  urls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  });
}
