const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../config');
const { requireUserBySessionId, getBySessionId } = require('./userAuthService');

function toAbsoluteUploadPath(relativeUrl) {
  if (!relativeUrl?.startsWith('/uploads/')) return null;
  return path.join(config.uploadBasePath, relativeUrl.replace(/^\/uploads\//, ''));
}

function formatBackground(user) {
  if (!user) {
    return {
      background_url: null,
      overlay_opacity: 55,
      blur: 0,
      skin_data: null,
    };
  }
  return {
    background_url: user.background_url || null,
    overlay_opacity: user.background_overlay ?? 55,
    blur: user.background_blur ?? 0,
    skin_data: user.skin_data || null,
  };
}

function saveBackgroundFile(file) {
  const dir = path.join(config.uploadBasePath, 'backgrounds');
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const safeExt = allowed.includes(ext) ? ext : '.jpg';
  const filename = `bg_${Date.now()}${safeExt}`;
  const dest = path.join(dir, filename);
  fs.renameSync(file.path, dest);
  return `/uploads/backgrounds/${filename}`;
}

function removeBackgroundFile(backgroundUrl) {
  const abs = toAbsoluteUploadPath(backgroundUrl);
  if (!abs || !backgroundUrl.includes('/uploads/backgrounds/')) return;
  try {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch { /* ignore */ }
}

class UserBackgroundService {
  getBackground(sessionId) {
    const user = getBySessionId(sessionId);
    if (!user || !String(sessionId).startsWith('user_')) {
      return formatBackground(null);
    }
    return formatBackground(user);
  }

  updateSettings(sessionId, payload = {}) {
    const user = requireUserBySessionId(sessionId);
    const overlay = Math.max(0, Math.min(85, Number(payload.overlay_opacity ?? user.background_overlay ?? 55)));
    const blur = Math.max(0, Math.min(24, Number(payload.blur ?? user.background_blur ?? 0)));
    const hasSkinData = Object.prototype.hasOwnProperty.call(payload, 'skin_data');
    const skinData = hasSkinData ? (payload.skin_data || null) : user.skin_data;

    db.prepare(`
      UPDATE app_user
      SET background_overlay = ?, background_blur = ?, skin_data = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(overlay, blur, skinData, user.id);

    return formatBackground(getBySessionId(sessionId));
  }

  uploadBackground(sessionId, file) {
    const user = requireUserBySessionId(sessionId);
    const backgroundUrl = saveBackgroundFile(file);
    if (user.background_url) removeBackgroundFile(user.background_url);

    db.prepare(`
      UPDATE app_user
      SET background_url = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(backgroundUrl, user.id);

    return formatBackground(getBySessionId(sessionId));
  }

  clearBackground(sessionId) {
    const user = requireUserBySessionId(sessionId);
    if (user.background_url) removeBackgroundFile(user.background_url);

    db.prepare(`
      UPDATE app_user
      SET background_url = NULL, background_overlay = 55, background_blur = 0, skin_data = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).run(user.id);

    return formatBackground(getBySessionId(sessionId));
  }
}

module.exports = new UserBackgroundService();
