const userBackgroundService = require('../../services/userBackgroundService');
const { success, fail } = require('../../utils/response');

exports.getBackground = (req, res) => {
  try {
    const sessionId = req.query.user_session_id;
    if (!sessionId) return res.status(400).json(fail(400, '缺少 user_session_id'));
    const data = userBackgroundService.getBackground(sessionId);
    res.json(success(data));
  } catch (e) {
    res.status(400).json(fail(400, e.message || '获取背景失败'));
  }
};

exports.updateBackground = (req, res) => {
  try {
    const sessionId = req.body?.user_session_id;
    if (!sessionId) return res.status(400).json(fail(400, '缺少 user_session_id'));
    const data = userBackgroundService.updateSettings(sessionId, req.body || {});
    res.json(success(data, '背景设置已保存'));
  } catch (e) {
    const code = e.message?.includes('登录') ? 401 : 400;
    res.status(code).json(fail(code, e.message || '保存背景失败'));
  }
};

exports.uploadBackground = (req, res) => {
  try {
    if (!req.file) return res.status(400).json(fail(400, '请上传背景图片'));

    const sessionId = req.body?.user_session_id;
    if (!sessionId) return res.status(400).json(fail(400, '缺少 user_session_id'));

    const data = userBackgroundService.uploadBackground(sessionId, req.file);
    res.json(success(data, '背景已上传'));
  } catch (e) {
    const code = e.message?.includes('登录') ? 401 : 400;
    res.status(code).json(fail(code, e.message || '背景上传失败'));
  }
};

exports.clearBackground = (req, res) => {
  try {
    const sessionId = req.body?.user_session_id;
    if (!sessionId) return res.status(400).json(fail(400, '缺少 user_session_id'));
    const data = userBackgroundService.clearBackground(sessionId);
    res.json(success(data, '已恢复默认背景'));
  } catch (e) {
    const code = e.message?.includes('登录') ? 401 : 400;
    res.status(code).json(fail(code, e.message || '清除背景失败'));
  }
};
