import { normalizeBilibiliSkin } from './normalizeTheme';
import { extractSkinZip, revokeBlobUrls } from './unzipSkin';

function readText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file, 'UTF-8');
  });
}

function readBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsArrayBuffer(file);
  });
}

function unwrapSkinJson(parsed) {
  if (parsed?.data?.properties) {
    return {
      ...parsed.data,
      properties: parsed.data.properties,
    };
  }
  if (parsed?.data && typeof parsed.data === 'object' && !parsed.data.properties) {
    return {
      id: parsed.id,
      name: parsed.name,
      preview: parsed.preview,
      package_url: parsed.package_url,
      properties: parsed.data,
    };
  }
  if (parsed?.properties) return parsed;
  throw new Error('无法识别的 bilibili-skin JSON 结构');
}

/**
 * 解析用户选择的 bilibili-skin 文件（.json / .zip）。
 */
export async function parseSkinFile(file) {
  if (!file) throw new Error('未选择文件');

  const lowerName = (file.name || '').toLowerCase();
  const isZip = lowerName.endsWith('.zip') || file.type === 'application/zip';
  const isJson = lowerName.endsWith('.json') || file.type === 'application/json';

  if (!isZip && !isJson) {
    throw new Error('请选择 .json 或 .zip 主题文件');
  }

  if (isJson) {
    const text = await readText(file);
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('JSON 解析失败');
    }
    const raw = unwrapSkinJson(parsed);
    return {
      theme: normalizeBilibiliSkin(raw),
      blobUrls: [],
    };
  }

  const buffer = await readBuffer(file);
  const { parsed, assetMap, blobUrls } = extractSkinZip(buffer);
  const raw = {
    name: parsed.name,
    item_id: parsed.item_id,
    id: parsed.item_id,
    preview: parsed.preview,
    package_url: parsed.package_url,
    properties: parsed.properties || {},
  };
  return {
    theme: normalizeBilibiliSkin(raw, assetMap),
    blobUrls,
  };
}

export function cleanupParsedSkin(result) {
  if (result?.blobUrls?.length) revokeBlobUrls(result.blobUrls);
}
