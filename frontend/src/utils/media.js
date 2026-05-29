export function resolveMediaUrl(mediaPath) {
  if (!mediaPath) return '';
  if (/^https?:\/\//i.test(mediaPath)) return mediaPath;
  return mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`;
}
