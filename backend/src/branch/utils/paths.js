const path = require('path');
const config = require('../../config');

function toAbsoluteUploadPath(relativeUrl) {
  if (!relativeUrl?.startsWith('/uploads/')) return null;
  return path.join(config.uploadBasePath, relativeUrl.replace(/^\/uploads\//, ''));
}

function toPublicUploadUrl(absolutePath) {
  const base = path.resolve(config.uploadBasePath);
  const resolved = path.resolve(absolutePath);
  if (!resolved.startsWith(base)) return null;
  const relative = resolved.slice(base.length).replace(/\\/g, '/');
  return `/uploads${relative.startsWith('/') ? relative : `/${relative}`}`;
}

module.exports = { toAbsoluteUploadPath, toPublicUploadUrl };
