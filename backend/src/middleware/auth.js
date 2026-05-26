const jwt = require('jsonwebtoken');
const config = require('../config');
const { fail } = require('../utils/response');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json(fail(401, '未授权，请先登录'));
  }

  try {
    const token = header.slice(7);
    req.admin = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    return res.status(401).json(fail(401, 'Token 无效或已过期'));
  }
}

module.exports = authMiddleware;
