const secretsService = require('../../services/secretsService');
const aiModelService = require('../../services/aiModelService');
const { success, fail } = require('../../utils/response');

exports.getAiSettings = (_req, res) => {
  res.json(success(secretsService.getAiSettingsMasked()));
};

exports.saveAiSettings = (req, res) => {
  try {
    const { endpoint, api_key, base_url, video_fps } = req.body;
    if (!endpoint) {
      return res.status(400).json(fail(400, 'Endpoint ID 不能为空'));
    }

    const current = secretsService.getAiCredentials();
    if (!api_key && !current?.apiKey) {
      return res.status(400).json(fail(400, '首次配置必须填写 API Key'));
    }

    const data = secretsService.saveAiCredentials({
      apiKey: api_key || undefined,
      endpoint,
      baseUrl: base_url,
      videoFps: video_fps != null ? Number(video_fps) : undefined,
    });

    res.json(success(data, 'AI 配置已加密保存到本地'));
  } catch (err) {
    res.status(500).json(fail(500, err.message));
  }
};

exports.testAiSettings = async (req, res) => {
  try {
    const { endpoint, api_key, base_url, video_fps } = req.body || {};
    const current = secretsService.getAiCredentials();

    const creds = {
      apiKey: api_key || current?.apiKey,
      endpoint: endpoint || current?.endpoint,
      baseUrl: base_url || current?.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3',
      videoFps: Number(video_fps ?? current?.videoFps ?? 1),
    };

    if (!creds.apiKey || !creds.endpoint) {
      return res.status(400).json(fail(400, '请先配置 API Key 和 Endpoint'));
    }

    const ok = await aiModelService.testConnection(creds);
    res.json(success({ connected: ok }, 'API 连接测试成功'));
  } catch (err) {
    res.status(400).json(fail(400, `连接测试失败: ${err.message}`));
  }
};

exports.deleteAiSettings = (_req, res) => {
  secretsService.clearAiCredentials();
  res.json(success(null, 'AI 配置已清除'));
};
