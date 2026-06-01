const fs = require('fs');
const path = require('path');
const secretsService = require('./secretsService');
const { AI_SYSTEM_PROMPT, MOCK_HIGHLIGHTS } = require('../config/prompts');
const { BRANCH_AI_SYSTEM_PROMPT, MOCK_BRANCH_POINTS } = require('../config/branchPrompts');

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
      throw new Error(`AI 返回结果无法解析为高光点（JSON 可能不完整）。原始返回: ${text.slice(0, 400)}`);
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
    const instruction = `${AI_SYSTEM_PROMPT}\n\n请分析上述视频，识别恰好 3 个高光点，严格按 JSON 格式返回完整闭合 JSON，不要输出其他文字。`;

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

  _normalizeAiJsonText(text) {
    if (!text) return '';
    let s = String(text).trim();
    const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) s = fenced[1].trim();
    return s;
  }

  _extractRootJsonBlock(text, rootKey) {
    const s = this._normalizeAiJsonText(text);
    const keyIdx = s.indexOf(`"${rootKey}"`);
    if (keyIdx < 0) return null;
    const start = s.lastIndexOf('{', keyIdx);
    if (start < 0) return null;

    let depth = 0;
    for (let i = start; i < s.length; i += 1) {
      if (s[i] === '{') depth += 1;
      if (s[i] === '}') {
        depth -= 1;
        if (depth === 0) return s.slice(start, i + 1);
      }
    }
    return s.slice(start);
  }

  /** 从可能截断的 JSON 文本中逐个提取完整对象 */
  _salvageArrayObjects(text, arrayKey) {
    const s = this._normalizeAiJsonText(text);
    const arrMarker = new RegExp(`"${arrayKey}"\\s*:\\s*\\[`);
    const match = arrMarker.exec(s);
    if (!match) return [];

    const arrStart = match.index + match[0].length;
    const items = [];
    let depth = 0;
    let objStart = -1;

    for (let i = arrStart; i < s.length; i += 1) {
      const ch = s[i];
      if (ch === '{') {
        if (depth === 0) objStart = i;
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0 && objStart >= 0) {
          try {
            items.push(JSON.parse(s.slice(objStart, i + 1)));
          } catch { /* skip malformed object */ }
          objStart = -1;
        }
      } else if (ch === ']' && depth === 0) {
        break;
      }
    }
    return items;
  }

  _tryParseRootArray(text, rootKey) {
    const block = this._extractRootJsonBlock(text, rootKey);
    if (block) {
      try {
        const parsed = JSON.parse(block);
        if (Array.isArray(parsed[rootKey])) return parsed[rootKey];
      } catch {
        // truncated JSON — try closing brackets
        for (const suffix of [']}', ']}', '}', '']) {
          try {
            const parsed = JSON.parse(`${block}${suffix}`);
            if (Array.isArray(parsed[rootKey])) return parsed[rootKey];
          } catch { /* continue */ }
        }
      }
    }
    return this._salvageArrayObjects(text, rootKey);
  }

  _normalizeHighlightCategory(category) {
    const raw = String(category || '').trim().toLowerCase();
    const map = {
      conflict: 'conflict',
      冲突: 'conflict',
      reversal: 'reversal',
      反转: 'reversal',
      sweet: 'sweet',
      撒糖: 'sweet',
      甜: 'sweet',
      scene: 'scene',
      名场面: 'scene',
    };
    if (map[raw]) return map[raw];
    if (raw.includes('冲突') || raw.includes('吵') || raw.includes('打')) return 'conflict';
    if (raw.includes('反转') || raw.includes('身份')) return 'reversal';
    if (raw.includes('甜') || raw.includes('糖')) return 'sweet';
    return 'scene';
  }

  _parseHighlights(text) {
    const rawItems = this._tryParseRootArray(text, 'highlights');
    return rawItems
      .filter((h) => h && h.timestamp != null && h.title && h.options?.length)
      .map((h) => ({
        timestamp: Math.floor(Number(h.timestamp)),
        category: this._normalizeHighlightCategory(h.category),
        title: String(h.title).slice(0, 80),
        options: (h.options || []).slice(0, 3).map((o) => String(o).slice(0, 40)),
      }));
  }

  _mockAnalyze(duration) {
    const maxTime = Math.max(duration - 10, 60);
    return MOCK_HIGHLIGHTS.map((h, i) => ({
      ...h,
      timestamp: Math.min(Math.floor((maxTime / MOCK_HIGHLIGHTS.length) * (i + 1)), maxTime),
    }));
  }

  async analyzeBranches(videoPath, duration = 360, overrideCreds) {
    const creds = this._getCreds(overrideCreds);

    if (!creds?.apiKey || !creds?.endpoint) {
      return {
        branch_points: this._mockAnalyzeBranches(duration),
        source: 'mock',
        reason: '请先在管理后台 → API 配置 中保存密钥',
      };
    }

    if (!fs.existsSync(videoPath)) {
      throw new Error(`视频文件不存在: ${videoPath}`);
    }

    const fileId = await this._uploadVideoFile(videoPath, creds);
    await this._waitForFileProcessed(fileId, creds);
    const text = await this._callResponsesApiWithPrompt(fileId, creds, BRANCH_AI_SYSTEM_PROMPT);
    const branch_points = this._parseBranchPoints(text);
    if (!branch_points.length) {
      throw new Error(`AI 返回结果无法解析为分支点。原始返回: ${text.slice(0, 200)}`);
    }
    return { branch_points, source: 'doubao', fileId };
  }

  async _callResponsesApiWithPrompt(fileId, creds, systemPrompt) {
    const instruction = `${systemPrompt}\n\n请分析上述视频，严格按 JSON 格式返回，不要输出其他文字。`;
    const res = await fetch(`${creds.baseUrl}/responses`, {
      method: 'POST',
      headers: this._headers(creds.apiKey),
      body: JSON.stringify({
        model: creds.endpoint,
        input: [{
          role: 'user',
          content: [
            { type: 'input_video', file_id: fileId },
            { type: 'input_text', text: instruction },
          ],
        }],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || `模型调用失败 (${res.status})`);
    }
    return this._extractResponseText(data);
  }

  _parseBranchPoints(text) {
    const rawItems = this._tryParseRootArray(text, 'branch_points');
    return rawItems
      .filter((p) => p && p.timestamp != null && p.title && p.choices?.length >= 2)
      .map((p) => ({
        timestamp: Math.floor(Number(p.timestamp)),
        title: String(p.title).slice(0, 80),
        choices: p.choices.slice(0, 2).map((c) => ({
          option_label: c.option_label || c.label,
          option_desc: c.option_desc || c.desc || '',
          narration: c.narration || c.text || c.option_label,
          image_prompt: c.image_prompt || '',
        })),
      }));
  }

  _mockAnalyzeBranches(duration) {
    const maxTime = Math.max(duration - 15, 60);
    return MOCK_BRANCH_POINTS.map((p, i) => ({
      ...p,
      timestamp: Math.min(Math.floor((maxTime / MOCK_BRANCH_POINTS.length) * (i + 1)), maxTime),
    }));
  }
}

module.exports = new AIModelService();
