const userAuthService = require('../../services/userAuthService');
const { success, fail } = require('../../utils/response');

exports.register = (req, res) => {
  try {
    const { username, password, merge_session_id: mergeSessionId } = req.body || {};
    const data = userAuthService.register(username, password, mergeSessionId);
    res.json(success(data));
  } catch (e) {
    res.status(400).json(fail(400, e.message || '注册失败'));
  }
};

exports.login = (req, res) => {
  try {
    const { username, password, merge_session_id: mergeSessionId } = req.body || {};
    const data = userAuthService.login(username, password, mergeSessionId);
    res.json(success(data));
  } catch (e) {
    res.status(401).json(fail(401, e.message || '登录失败'));
  }
};

exports.me = (req, res) => {
  try {
    const sessionId = req.query.user_session_id;
    if (!sessionId) return res.status(400).json(fail(400, '缺少 user_session_id'));
    const data = userAuthService.getProfile(sessionId);
    res.json(success(data));
  } catch (e) {
    res.status(401).json(fail(401, e.message || '获取账号信息失败'));
  }
};

exports.uploadAvatar = (req, res) => {
  try {
    if (!req.file) return res.status(400).json(fail(400, '请上传头像图片'));

    const sessionId = req.body?.user_session_id;
    if (!sessionId) return res.status(400).json(fail(400, '缺少 user_session_id'));

    const data = userAuthService.updateAvatar(sessionId, req.file);
    res.json(success(data, '头像已更新'));
  } catch (e) {
    res.status(400).json(fail(400, e.message || '头像上传失败'));
  }
};
