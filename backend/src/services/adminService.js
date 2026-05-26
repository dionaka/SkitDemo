const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

class AdminService {
  login(username, password) {
    const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      throw new Error('用户名或密码错误');
    }

    const token = jwt.sign(
      { adminId: admin.id, username: admin.username },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    return { admin_id: admin.id, username: admin.username, token };
  }
}

module.exports = new AdminService();
