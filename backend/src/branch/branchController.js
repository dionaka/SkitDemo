const branchService = require('./branchService');
const { success, fail } = require('../utils/response');

exports.listDemos = (_req, res) => {
  const list = branchService.listPublished();
  res.json(success({ list }));
};

exports.getDemo = async (req, res) => {
  try {
    const data = await branchService.getDemoEntry(req.params.id);
    if (!data) return res.status(404).json(fail(404, '分支 Demo 不存在或未发布'));
    res.json(success(data));
  } catch (err) {
    res.status(500).json(fail(500, err.message));
  }
};

exports.getNode = async (req, res) => {
  try {
    const node = await branchService.getNodeDetail(req.params.id);
    if (!node) return res.status(404).json(fail(404, '分支节点不存在'));
    res.json(success({ node }));
  } catch (err) {
    res.status(500).json(fail(500, err.message));
  }
};

exports.choose = async (req, res) => {
  try {
    const { from_node_id, choice_id, user_session_id } = req.body;
    if (!from_node_id || !choice_id || !user_session_id) {
      return res.status(400).json(fail(400, '缺少必要参数'));
    }
    const data = await branchService.choose({
      demoId: req.params.id,
      fromNodeId: from_node_id,
      choiceId: choice_id,
      userSessionId: user_session_id,
    });
    res.json(success(data));
  } catch (err) {
    res.status(400).json(fail(400, err.message));
  }
};

exports.stats = (req, res) => {
  const data = branchService.getDemoStats(req.params.id);
  res.json(success(data));
};

exports.listGenerators = (_req, res) => {
  const { listGenerators } = require('./generators');
  res.json(success({ generators: listGenerators() }));
};
