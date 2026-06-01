const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const branchAssetService = require('./branchAssetService');
const secretsService = require('../services/secretsService');
const { toPublicUploadUrl } = require('./utils/paths');
const { resolveVoice } = require('./branchGenerationOptions');

const execFileAsync = promisify(execFile);

/** TTS 提供方注册表 — 后续可在此增加 edge / 复刻音色等 */
const providers = {
  windows_sapi: synthesizeWindowsSapi,
  doubao_tts: synthesizeDoubaoTts,
  siliconflow_tts: synthesizeSiliconflowTts,
  file: async (_text, { audio_url: audioUrl }) => audioUrl || null,
};

const PROVIDER_META = {
  windows_sapi: {
    id: 'windows_sapi',
    label: 'Windows 本地 SAPI',
    description: '本机语音，无需密钥',
  },
  doubao_tts: {
    id: 'doubao_tts',
    label: '豆包语音合成',
    description: '火山 openspeech HTTP 接口',
  },
  siliconflow_tts: {
    id: 'siliconflow_tts',
    label: '硅基流动 CosyVoice2',
    description: 'SiliconFlow /audio/speech，支持克隆音色',
  },
  file: {
    id: 'file',
    label: '上传音频',
    description: '使用 asset_spec.audio_url',
  },
};

function listProviders() {
  return Object.keys(providers);
}

function listProviderCatalog() {
  return listProviders().map((id) => ({
    ...PROVIDER_META[id],
    available: id === 'windows_sapi'
      ? os.platform() === 'win32'
      : id === 'doubao_tts'
        ? !!secretsService.getTtsCredentials()
        : id === 'siliconflow_tts'
          ? !!secretsService.getSiliconflowTtsCredentials()
          : true,
  }));
}

function estimateDuration(text, minSec = 4) {
  const chars = (text || '').replace(/\s/g, '').length;
  return Math.max(minSec, Math.min(20, Math.ceil(chars / 4)));
}

async function synthesizeWindowsSapi(text, { voice } = {}) {
  if (process.platform !== 'win32') return null;

  const cacheKey = branchAssetService.hashKey(['tts', 'windows_sapi', voice, text]);
  const outputPath = branchAssetService.generatedTtsPath(cacheKey, '.wav');

  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    return toPublicUploadUrl(outputPath);
  }

  const escapedText = String(text).replace(/'/g, "''");
  const escapedPath = outputPath.replace(/\\/g, '\\\\');
  const voiceSelect = voice && voice !== 'default'
    ? `$s.SelectVoice('${String(voice).replace(/'/g, "''")}');`
    : '';

  const script = `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
${voiceSelect}
$s.SetOutputToWaveFile('${escapedPath}')
$s.Speak('${escapedText}')
$s.Dispose()
`;

  try {
    await execFileAsync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
      timeout: 60000,
    });
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return toPublicUploadUrl(outputPath);
    }
  } catch (err) {
    console.warn('[branch-tts] Windows SAPI 合成失败:', err.message);
  }

  return null;
}

async function synthesizeDoubaoTts(text, { voice } = {}) {
  const creds = secretsService.getTtsCredentials();
  if (!creds?.appId || !creds?.accessToken) {
    console.warn('[branch-tts] 未配置豆包 TTS 密钥');
    return null;
  }

  const voiceType = voice && voice !== 'default' ? voice : creds.voiceType;
  const cacheKey = branchAssetService.hashKey(['tts', 'doubao_tts', voiceType, text]);
  const outputPath = branchAssetService.generatedTtsPath(cacheKey, '.mp3');

  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    return toPublicUploadUrl(outputPath);
  }

  const reqid = crypto.randomUUID();
  const body = {
    app: {
      appid: creds.appId,
      token: creds.accessToken,
      cluster: creds.cluster,
    },
    user: { uid: 'skitdemo' },
    audio: {
      voice_type: voiceType,
      encoding: 'mp3',
      speed_ratio: 1.0,
    },
    request: {
      reqid,
      text: String(text),
      text_type: 'plain',
      operation: 'query',
    },
  };

  try {
    const res = await fetch(creds.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer;${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const code = data.code ?? data.status_code;
    if (!res.ok || (code != null && code !== 3000 && code !== 0)) {
      throw new Error(data.message || data.status_text || `HTTP ${res.status}`);
    }

    const audioBase64 = data.data;
    if (!audioBase64) {
      throw new Error('TTS 返回无音频数据');
    }

    fs.writeFileSync(outputPath, Buffer.from(audioBase64, 'base64'));
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return toPublicUploadUrl(outputPath);
    }
  } catch (err) {
    console.warn('[branch-tts] 豆包 TTS 合成失败:', err.message);
  }

  return null;
}

async function synthesizeSiliconflowTts(text, { voice, speed } = {}) {
  const creds = secretsService.getSiliconflowTtsCredentials();
  if (!creds?.apiKey) {
    console.warn('[branch-tts] 未配置硅基流动 TTS 密钥');
    return null;
  }

  const voiceId = voice && voice !== 'default' ? voice : creds.voice;
  if (!voiceId) {
    console.warn('[branch-tts] 未配置硅基流动默认克隆音色 voice');
    return null;
  }

  const effSpeed = speed != null ? Number(speed) : creds.speed;
  const ext = creds.format === 'wav' ? '.wav' : creds.format === 'opus' ? '.opus' : '.mp3';
  const cacheKey = branchAssetService.hashKey(['tts', 'siliconflow_tts', voiceId, effSpeed, text]);
  const outputPath = branchAssetService.generatedTtsPath(cacheKey, ext);

  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    return toPublicUploadUrl(outputPath);
  }

  const url = `${creds.baseUrl}/audio/speech`;
  const body = {
    model: creds.model,
    voice: voiceId,
    input: String(text),
    response_format: creds.format,
    speed: effSpeed,
    gain: creds.gain,
  };
  if (creds.sampleRate) {
    body.sample_rate = creds.sampleRate;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        detail = errJson.error?.message || errJson.message || JSON.stringify(errJson);
      } catch {
        detail = await res.text().catch(() => detail);
      }
      throw new Error(detail);
    }

    if (!contentType.startsWith('audio/') && !contentType.startsWith('application/octet-stream')) {
      const errText = await res.text();
      throw new Error(errText.slice(0, 200) || '返回非音频内容');
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) {
      throw new Error('TTS 返回空音频');
    }

    fs.writeFileSync(outputPath, buffer);
    return toPublicUploadUrl(outputPath);
  } catch (err) {
    console.warn('[branch-tts] 硅基流动 TTS 合成失败:', err.message);
  }

  return null;
}

async function testSiliconflowTts(overrideCreds, sampleText = '你好，这是 SkitDemo 分支旁白测试。') {
  const creds = overrideCreds || secretsService.getSiliconflowTtsCredentials();
  if (!creds?.apiKey) {
    throw new Error('请先配置硅基流动 API Key');
  }
  if (!creds.voice) {
    throw new Error('请先配置默认克隆音色 voice');
  }

  const url = `${(creds.baseUrl || 'https://api.siliconflow.cn/v1').replace(/\/$/, '')}/audio/speech`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: creds.model || 'FunAudioLLM/CosyVoice2-0.5B',
      voice: creds.voice,
      input: sampleText,
      response_format: creds.format || 'mp3',
      speed: creds.speed ?? 1.0,
      gain: creds.gain ?? 0,
      ...(creds.sampleRate ? { sample_rate: creds.sampleRate } : {}),
    }),
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      detail = errJson.error?.message || errJson.message || JSON.stringify(errJson);
    } catch {
      detail = await res.text().catch(() => detail);
    }
    throw new Error(detail);
  }
  if (!contentType.startsWith('audio/') && !contentType.startsWith('application/octet-stream')) {
    throw new Error('TTS 返回非音频内容');
  }
  return true;
}

async function testDoubaoTts(overrideCreds, sampleText = '你好，这是 SkitDemo 分支旁白测试。') {
  const creds = overrideCreds || secretsService.getTtsCredentials();
  if (!creds?.appId || !creds?.accessToken) {
    throw new Error('请先配置 TTS App ID 与 Access Token');
  }

  const reqid = crypto.randomUUID();
  const res = await fetch(creds.baseUrl || 'https://openspeech.bytedance.com/api/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer;${creds.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app: {
        appid: creds.appId,
        token: creds.accessToken,
        cluster: creds.cluster || 'volcano_tts',
      },
      user: { uid: 'skitdemo-test' },
      audio: {
        voice_type: creds.voiceType || 'BV700_streaming',
        encoding: 'mp3',
        speed_ratio: 1.0,
      },
      request: {
        reqid,
        text: sampleText,
        text_type: 'plain',
        operation: 'query',
      },
    }),
  });

  const data = await res.json();
  const code = data.code ?? data.status_code;
  if (!res.ok || (code != null && code !== 3000 && code !== 0)) {
    throw new Error(data.message || data.status_text || `HTTP ${res.status}`);
  }
  if (!data.data) {
    throw new Error('TTS 返回无音频数据');
  }
  return true;
}

async function ensureAudio({ text, voice = 'default', provider = 'windows_sapi', audio_url: audioUrl, generation_options: genOpts }) {
  if (!text && audioUrl) {
    return { audio_url: audioUrl, duration: estimateDuration(text), provider: 'file' };
  }
  if (!text) {
    return { audio_url: null, duration: 4, provider: 'none' };
  }

  const resolvedVoice = genOpts ? resolveVoice({ ...genOpts, tts_voice: voice }) : voice;
  const fn = providers[provider] || providers.windows_sapi;
  let url = await fn(text, { voice: resolvedVoice, audio_url: audioUrl });

  if (!url && provider !== 'windows_sapi' && providers.windows_sapi) {
    url = await providers.windows_sapi(text, { voice: resolvedVoice });
  }

  const usedProvider = url
    ? (provider === 'file' ? 'file' : provider)
    : 'none';

  return {
    audio_url: url,
    duration: estimateDuration(text),
    provider: usedProvider,
  };
}

function registerProvider(id, handler) {
  if (typeof handler !== 'function') {
    throw new Error('TTS provider 必须是函数');
  }
  providers[id] = handler;
  PROVIDER_META[id] = PROVIDER_META[id] || { id, label: id, description: '' };
}

module.exports = {
  ensureAudio,
  listProviders,
  listProviderCatalog,
  registerProvider,
  estimateDuration,
  testDoubaoTts,
  testSiliconflowTts,
};
