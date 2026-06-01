const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../config');
const watchProgressService = require('./watchProgressService');

function createSessionId(userId) {
  return `user_${userId}_${crypto.randomBytes(8).toString('hex')}`;
}

function toAbsoluteUploadPath(relativeUrl) {
  if (!relativeUrl?.startsWith('/uploads/')) return null;
  return path.join(config.uploadBasePath, relativeUrl.replace(/^\/uploads\//, ''));
}

function formatUser(user) {
  if (!user) return null;
  return {
    user_id: user.id,
    username: user.username,
    user_session_id: user.session_id,
    avatar_url: user.avatar_url || null,
    created_at: user.created_at,
  };
}

function getBySessionId(sessionId) {
  if (!sessionId) return null;
  return db.prepare('SELECT * FROM app_user WHERE session_id = ?').get(sessionId);
}

function requireUserBySessionId(sessionId) {
  const user = getBySessionId(sessionId);
  if (!user) throw new Error('账号无效，请重新登录');
  return user;
}

function mergeAnonymousSession(fromSessionId, toSessionId) {
  if (!fromSessionId || !toSessionId || fromSessionId === toSessionId) return;
  if (!fromSessionId.startsWith('session_')) return;
  watchProgressService.mergeSession(fromSessionId, toSessionId);
}

function saveAvatarFile(file) {
  const avatarsDir = path.join(config.uploadBasePath, 'avatars');
  fs.mkdirSync(avatarsDir, { recursive: true });
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const safeExt = allowed.includes(ext) ? ext : '.jpg';
  const filename = `avatar_${Date.now()}${safeExt}`;
  const dest = path.join(avatarsDir, filename);
  fs.renameSync(file.path, dest);
  return `/uploads/avatars/${filename}`;
}

function removeAvatarFile(avatarUrl) {
  const abs = toAbsoluteUploadPath(avatarUrl);
  if (!abs || !avatarUrl.includes('/uploads/avatars/')) return;
  try {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch { /* ignore */ }
}

class UserAuthService {
  register(username, password, mergeSessionId) {
    const name = String(username || '').trim();
    const pwd = String(password || '');

    if (name.length < 3) throw new Error('用户名至少 3 个字符');
    if (pwd.length < 6) throw new Error('密码至少 6 位');

    const exists = db.prepare('SELECT id FROM app_user WHERE username = ?').get(name);
    if (exists) throw new Error('用户名已被占用');

    const passwordHash = bcrypt.hashSync(pwd, 10);
    const tempSession = `pending_${crypto.randomBytes(8).toString('hex')}`;
    const result = db.prepare(`
      INSERT INTO app_user (username, password_hash, session_id)
      VALUES (?, ?, ?)
    `).run(name, passwordHash, tempSession);

    const userId = result.lastInsertRowid;
    const sessionId = createSessionId(userId);
    db.prepare(`
      UPDATE app_user
      SET session_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(sessionId, userId);

    mergeAnonymousSession(mergeSessionId, sessionId);

    return formatUser(getBySessionId(sessionId));
  }

  login(username, password, mergeSessionId) {
    const name = String(username || '').trim();
    const pwd = String(password || '');

    if (!name || !pwd) throw new Error('用户名和密码不能为空');

    const user = db.prepare('SELECT * FROM app_user WHERE username = ?').get(name);
    if (!user || !bcrypt.compareSync(pwd, user.password_hash)) {
      throw new Error('用户名或密码错误');
    }

    mergeAnonymousSession(mergeSessionId, user.session_id);

    return formatUser(user);
  }

  getProfile(sessionId) {
    return formatUser(requireUserBySessionId(sessionId));
  }

  updateAvatar(sessionId, file) {
    const user = requireUserBySessionId(sessionId);
    const avatarUrl = saveAvatarFile(file);
    if (user.avatar_url) removeAvatarFile(user.avatar_url);

    db.prepare(`
      UPDATE app_user
      SET avatar_url = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(avatarUrl, user.id);

    return formatUser(getBySessionId(sessionId));
  }
}

module.exports = new UserAuthService();
