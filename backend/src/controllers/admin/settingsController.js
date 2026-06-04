const secretsService = require('../../services/secretsService');
const aiModelService = require('../../services/aiModelService');
const branchTtsService = require('../../branch/branchTtsService');
const branchImageService = require('../../branch/branchImageService');
const { explainImageApiError } = require('../../branch/branchImageErrors');
const { success, fail } = require('../../utils/response');

exports.getAiSettings = (_req, res) => {
  res.json(success(secretsService.getAiSettingsMasked()));
};

exports.saveAiSettings = (req, res) => {
  try {
    const { endpoint, api_key, base_url, video_fps, image_model, image_endpoint, image_size, image_api_key } = req.body;
    if (!endpoint) {
      return res.status(400).json(fail(400, 'Endpoint ID 不能为空'));
    }
    if (image_endpoint && !String(image_endpoint).startsWith('ep-')) {
      return res.status(400).json(fail(400, '图生图 Endpoint 必须以 ep- 开头（Seedream 推理接入点，不是模型名）'));
    }
    if (image_endpoint && image_endpoint === endpoint) {
      return res.status(400).json(fail(400, '图生图 Endpoint 不能与视频分析 Endpoint 相同，请为 Seedream 单独创建接入点'));
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
      imageModel: image_model,
      imageEndpoint: image_endpoint,
      imageApiKey: image_api_key,
      imageSize: image_size,
    });

    res.json(success(data, 'AI 配置已加密保存到本地'));
  } catch (err) {
    res.status(500).json(fail(500, err.message));
  }
};

exports.testAiSettings = async (req, res) => {
  try {
    const { endpoint, api_key, base_url, video_fps, image_model, image_endpoint, image_size } = req.body || {};
    const current = secretsService.getAiCredentials();

    const creds = {
      apiKey: api_key || current?.apiKey,
      endpoint: endpoint || current?.endpoint,
      baseUrl: base_url || current?.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3',
      videoFps: Number(video_fps ?? current?.videoFps ?? 1),
      imageModel: image_model || current?.imageModel,
      imageEndpoint: image_endpoint || current?.imageEndpoint,
      imageSize: image_size || current?.imageSize || '1280x720',
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

exports.testImageSettings = async (req, res) => {
  try {
    const { api_key, base_url, image_endpoint, image_size, image_api_key } = req.body || {};
    const current = secretsService.getAiCredentials();
    const imageEndpoint = image_endpoint || current?.imageEndpoint;

    if (!imageEndpoint?.startsWith('ep-')) {
      return res.status(400).json(fail(400, '请先填写 Seedream 图生图 Endpoint（ep- 开头）'));
    }

    const creds = {
      apiKey: image_api_key || api_key || current?.imageApiKey || current?.apiKey,
      model: imageEndpoint,
      baseUrl: base_url || current?.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3',
      size: image_size || current?.imageSize || '2K',
    };

    if (!creds.apiKey) {
      return res.status(400).json(fail(400, '请先配置 API Key'));
    }

    await branchImageService.testConnection(creds);
    res.json(success({ connected: true, endpoint: imageEndpoint }, '图生图连接测试成功'));
  } catch (err) {
    const detail = explainImageApiError(err.message);
    res.status(400).json(fail(400, detail));
  }
};

exports.deleteAiSettings = (_req, res) => {
  secretsService.clearAiCredentials();
  res.json(success(null, 'AI 配置已清除'));
};

exports.getTtsSettings = (_req, res) => {
  res.json(success(secretsService.getTtsSettingsMasked()));
};

exports.saveTtsSettings = (req, res) => {
  try {
    const { app_id, access_token, cluster, voice_type, base_url } = req.body;
    if (!app_id) {
      return res.status(400).json(fail(400, 'App ID 不能为空'));
    }

    const current = secretsService.getTtsCredentials();
    if (!access_token && !current?.accessToken) {
      return res.status(400).json(fail(400, '首次配置必须填写 Access Token'));
    }

    const data = secretsService.saveTtsCredentials({
      appId: app_id,
      accessToken: access_token || undefined,
      cluster,
      voiceType: voice_type,
      baseUrl: base_url,
    });

    res.json(success(data, 'TTS 配置已加密保存到本地'));
  } catch (err) {
    res.status(500).json(fail(500, err.message));
  }
};

exports.testTtsSettings = async (req, res) => {
  try {
    const { app_id, access_token, cluster, voice_type, base_url } = req.body || {};
    const current = secretsService.getTtsCredentials();

    const creds = {
      appId: app_id || current?.appId,
      accessToken: access_token || current?.accessToken,
      cluster: cluster || current?.cluster || 'volcano_tts',
      voiceType: voice_type || current?.voiceType || 'BV700_streaming',
      baseUrl: base_url || current?.baseUrl || 'https://openspeech.bytedance.com/api/v1/tts',
    };

    await branchTtsService.testDoubaoTts(creds);
    res.json(success({ connected: true }, 'TTS 连接测试成功'));
  } catch (err) {
    res.status(400).json(fail(400, `连接测试失败: ${err.message}`));
  }
};

exports.deleteTtsSettings = (_req, res) => {
  secretsService.clearTtsCredentials();
  res.json(success(null, 'TTS 配置已清除'));
};

exports.getSiliconflowTtsSettings = (_req, res) => {
  res.json(success(secretsService.getSiliconflowTtsSettingsMasked()));
};

exports.saveSiliconflowTtsSettings = (req, res) => {
  try {
    const { api_key, base_url, model, format, speed, gain, sample_rate, voice } = req.body;
    const current = secretsService.getSiliconflowTtsCredentials();
    if (!api_key && !current?.apiKey) {
      return res.status(400).json(fail(400, '首次配置必须填写 API Key'));
    }

    const data = secretsService.saveSiliconflowTtsCredentials({
      apiKey: api_key || undefined,
      baseUrl: base_url,
      model,
      format,
      speed,
      gain,
      sampleRate: sample_rate,
      voice,
    });

    res.json(success(data, '硅基流动 TTS 配置已加密保存到本地'));
  } catch (err) {
    res.status(500).json(fail(500, err.message));
  }
};

exports.testSiliconflowTtsSettings = async (req, res) => {
  try {
    const { api_key, base_url, model, format, speed, gain, sample_rate, voice } = req.body || {};
    const current = secretsService.getSiliconflowTtsCredentials();

    const creds = {
      apiKey: api_key || current?.apiKey,
      baseUrl: base_url || current?.baseUrl || 'https://api.siliconflow.cn/v1',
      model: model || current?.model || 'FunAudioLLM/CosyVoice2-0.5B',
      format: format || current?.format || 'mp3',
      speed: speed != null ? Number(speed) : (current?.speed ?? 1.0),
      gain: gain != null ? Number(gain) : (current?.gain ?? 0),
      sampleRate: sample_rate != null ? Number(sample_rate) : (current?.sampleRate ?? 44100),
      voice: voice || current?.voice,
    };

    if (!creds.apiKey) {
      return res.status(400).json(fail(400, '请先配置 API Key'));
    }
    if (!creds.voice) {
      return res.status(400).json(fail(400, '请先配置默认克隆音色 voice'));
    }

    await branchTtsService.testSiliconflowTts(creds);
    res.json(success({ connected: true }, '硅基流动 TTS 连接测试成功'));
  } catch (err) {
    res.status(400).json(fail(400, `连接测试失败: ${err.message}`));
  }
};

exports.deleteSiliconflowTtsSettings = (_req, res) => {
  secretsService.clearSiliconflowTtsCredentials();
  res.json(success(null, '硅基流动 TTS 配置已清除'));
};

const biliCookiesService = require('../../services/biliCookiesService');
const linkResolveService = require('../../services/linkResolveService');

exports.getBiliCookiesSettings = (_req, res) => {
  const status = biliCookiesService.getStatus();
  const cookies_text = status.configured ? biliCookiesService.readCookieTextForDisplay() : '';
  res.json(success({ ...status, cookies_text }));
};

exports.saveBiliCookiesSettings = (req, res) => {
  try {
    const { cookies_text } = req.body || {};
    const status = biliCookiesService.saveCookieText(cookies_text);
    res.json(success(status, 'B 站 Cookie 已保存'));
  } catch (err) {
    res.status(400).json(fail(400, err.message));
  }
};

exports.testBiliCookiesSettings = async (req, res) => {
  try {
    const { test_url } = req.body || {};
    const result = await linkResolveService.testBiliCookies(test_url);
    res.json(success(result, 'Cookie 有效，yt-dlp 解析成功'));
  } catch (err) {
    res.status(400).json(fail(400, err.message));
  }
};

exports.deleteBiliCookiesSettings = (_req, res) => {
  const status = biliCookiesService.clearCookies();
  res.json(success(status, 'B 站 Cookie 已清除'));
};
