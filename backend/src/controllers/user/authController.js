const userAuthService = require('../../services/userAuthService');
const { success, fail } = require('../../utils/response');

exports.register = (req, res) => {
  try {
    const { username, password } = req.body || {};
    const data = userAuthService.register(username, password);
    res.json(success(data));
  } catch (e) {
    res.status(400).json(fail(400, e.message || '注册失败'));
  }
};

exports.login = (req, res) => {
  try {
    const { username, password } = req.body || {};
    const data = userAuthService.login(username, password);
    res.json(success(data));
  } catch (e) {
    res.status(401).json(fail(401, e.message || '登录失败'));
  }
};
