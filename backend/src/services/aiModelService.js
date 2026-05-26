const fs = require('fs');
const path = require('path');
const secretsService = require('./secretsService');
const { AI_SYSTEM_PROMPT, MOCK_HIGHLIGHTS } = require('../config/prompts');

class AIModelService {
  _getCreds(override) {
    return override || secretsService.getAiCredentials();
  }

  _headers(apiKey) {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async testConnection(creds) {
    const res = await fetch(`${creds.baseUrl}/files?limit=1`, {
      headers: { Authorization: `Bearer ${creds.apiKey}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error?.message || `HTTP ${res.status}`);
    }
    return true;
  }

  async analyzeVideo(videoPath, duration = 360, overrideCreds) {
    const creds = this._getCreds(overrideCreds);

    if (!creds?.apiKey || !creds?.endpoint) {
      console.warn('[AI] 未配置 API Key 或 Endpoint，使用模拟数据');
      return {
        highlights: this._mockAnalyze(duration),
        source: 'mock',
        reason: '请先在管理后台 → API 配置 中保存密钥',
      };
    }

    if (!fs.existsSync(videoPath)) {
      throw new Error(`视频文件不存在: ${videoPath}`);
    }

    console.log('[AI] 开始上传视频到火山方舟 Files API...');
    const fileId = await this._uploadVideoFile(videoPath, creds);
    console.log('[AI] 视频上传成功，file_id:', fileId);

    console.log('[AI] 等待视频预处理...');
    await this._waitForFileProcessed(fileId, creds);

    console.log('[AI] 调用 Doubao API 分析高光点...');
    const text = await this._callResponsesApi(fileId, creds);
    console.log('[AI] 模型原始返回(前500字):', text.slice(0, 500));

    const highlights = this._parseHighlights(text);
    if (!highlights.length) {
      throw new Error(`AI 返回结果无法解析为高光点。原始返回: ${text.slice(0, 200)}`);
    }

    console.log(`[AI] 真实分析完成，识别 ${highlights.length} 个高光点`);
    return { highlights, source: 'doubao', fileId };
  }

  async _uploadVideoFile(videoPath, creds) {
    const formData = new FormData();
    const buffer = fs.readFileSync(videoPath);
    const blob = new Blob([buffer], { type: 'video/mp4' });
    formData.append('purpose', 'user_data');
    formData.append('file', blob, path.basename(videoPath));
    formData.append('preprocess_configs[video][fps]', String(creds.videoFps));

    const res = await fetch(`${creds.baseUrl}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.apiKey}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || `文件上传失败 (${res.status})`);
    }
    return data.id;
  }

  async _waitForFileProcessed(fileId, creds, maxWaitMs = 180000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const res = await fetch(`${creds.baseUrl}/files/${fileId}`, {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `查询文件状态失败 (${res.status})`);
      }
      if (data.status === 'processed' || data.status === 'active') return;
      if (data.status === 'failed' || data.status === 'error') {
        throw new Error('视频预处理失败');
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('视频预处理超时，请稍后重试');
  }

  async _callResponsesApi(fileId, creds) {
    const instruction = `${AI_SYSTEM_PROMPT}\n\n请分析上述视频，识别3-5个高光点，严格按 JSON 格式返回，不要输出其他文字。`;

    const res = await fetch(`${creds.baseUrl}/responses`, {
      method: 'POST',
      headers: this._headers(creds.apiKey),
      body: JSON.stringify({
        model: creds.endpoint,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_video', file_id: fileId },
              { type: 'input_text', text: instruction },
            ],
          },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || `模型调用失败 (${res.status})`);
    }
    return this._extractResponseText(data);
  }

  _extractResponseText(data) {
    if (typeof data.output_text === 'string') return data.output_text;
    const parts = [];
    for (const item of data.output || []) {
      if (item.type === 'message' && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c.type === 'output_text' && c.text) parts.push(c.text);
        }
      }
    }
    if (parts.length) return parts.join('\n');
    const choice = data.choices?.[0]?.message?.content;
    if (typeof choice === 'string') return choice;
    return JSON.stringify(data);
  }

  _parseHighlights(text) {
    const jsonMatch = text.match(/\{[\s\S]*"highlights"[\s\S]*\}/);
    if (!jsonMatch) return [];
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return (parsed.highlights || [])
        .filter((h) => h.timestamp != null && h.title && h.category && h.options?.length)
        .map((h) => ({
          timestamp: Math.floor(Number(h.timestamp)),
          category: h.category,
          title: h.title,
          options: h.options.slice(0, 3),
        }));
    } catch {
      return [];
    }
  }

  _mockAnalyze(duration) {
    const maxTime = Math.max(duration - 10, 60);
    return MOCK_HIGHLIGHTS.map((h, i) => ({
      ...h,
      timestamp: Math.min(Math.floor((maxTime / MOCK_HIGHLIGHTS.length) * (i + 1)), maxTime),
    }));
  }
}

module.exports = new AIModelService();
