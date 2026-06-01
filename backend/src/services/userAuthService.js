const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');

function createSessionId(userId) {
  return `user_${userId}_${crypto.randomBytes(8).toString('hex')}`;
}

class UserAuthService {
  register(username, password) {
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
    db.prepare('UPDATE app_user SET session_id = ? WHERE id = ?').run(sessionId, userId);

    return { username: name, user_session_id: sessionId };
  }

  login(username, password) {
    const name = String(username || '').trim();
    const pwd = String(password || '');

    if (!name || !pwd) throw new Error('用户名和密码不能为空');

    const user = db.prepare('SELECT * FROM app_user WHERE username = ?').get(name);
    if (!user || !bcrypt.compareSync(pwd, user.password_hash)) {
      throw new Error('用户名或密码错误');
    }

    return { username: user.username, user_session_id: user.session_id };
  }
}

module.exports = new UserAuthService();
