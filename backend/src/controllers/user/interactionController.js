const interactionService = require('../../services/interactionService');
const { success, fail } = require('../../utils/response');

exports.record = (req, res) => {
  try {
    const { highlight_id, user_session_id, selected_option } = req.body;
    if (!highlight_id || !user_session_id || !selected_option) {
      return res.status(400).json(fail(400, '参数不完整'));
    }
    const data = interactionService.record({ highlight_id, user_session_id, selected_option });
    res.json(success(data, '互动成功'));
  } catch (err) {
    res.status(400).json(fail(400, err.message));
  }
};

exports.stats = (req, res) => {
  const data = interactionService.getStats(req.params.highlightId);
  if (!data) return res.status(404).json(fail(404, '高光点不存在'));
  res.json(success(data));
};
