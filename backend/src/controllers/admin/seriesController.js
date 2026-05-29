const seriesService = require('../../services/seriesService');
const { success } = require('../../utils/response');

exports.list = (_req, res) => {
  const list = seriesService.listAll();
  res.json(success({ list }));
};
