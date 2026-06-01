const branchService = require('./branchService');
const branchTtsService = require('./branchTtsService');
const { success, fail } = require('../utils/response');

exports.listDemos = (_req, res) => {
  const list = branchService.listAll();
  res.json(success({ list }));
};

exports.getDemoTree = async (req, res) => {
  try {
    const data = await branchService.getDemoTree(req.params.id);
    if (!data) return res.status(404).json(fail(404, '分支 Demo 不存在'));
    res.json(success(data));
  } catch (err) {
    res.status(500).json(fail(500, err.message));
  }
};

exports.stats = (req, res) => {
  const data = branchService.getDemoStats(req.params.id);
  res.json(success(data));
};

exports.listTtsProviders = (_req, res) => {
  res.json(success({ providers: branchTtsService.listProviders() }));
};

exports.updateNode = async (req, res) => {
  try {
    const { label, node_type, branch_at, asset_spec } = req.body;
    const node = branchService.updateNode(req.params.id, {
      label,
      node_type,
      branch_at,
      asset_spec,
    });
    if (!node) return res.status(404).json(fail(404, '节点不存在'));
    const enriched = await branchService.getNodeDetail(req.params.id);
    res.json(success({ node: enriched }));
  } catch (err) {
    res.status(400).json(fail(400, err.message));
  }
};

exports.uploadNodeAssets = async (req, res) => {
  try {
    const node = branchService.applyUploadedAssets(req.params.id, req.files || {});
    if (!node) return res.status(404).json(fail(404, '节点不存在'));
    const enriched = await branchService.getNodeDetail(req.params.id);
    res.json(success({ node: enriched }));
  } catch (err) {
    res.status(400).json(fail(400, err.message));
  }
};

exports.prewarmDemo = async (req, res) => {
  try {
    await branchService.prewarmDemoAssets(req.params.id);
    res.json(success(null, '资源预热完成'));
  } catch (err) {
    res.status(500).json(fail(500, err.message));
  }
};
