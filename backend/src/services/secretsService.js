const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const VAULT_KEY_PATH = path.join(DATA_DIR, '.vault-key');
const SECRETS_PATH = path.join(DATA_DIR, 'secrets.vault');

class SecretsService {
  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    this._migrateFromEnvIfNeeded();
  }

  _getVaultKey() {
    if (!fs.existsSync(VAULT_KEY_PATH)) {
      fs.writeFileSync(VAULT_KEY_PATH, crypto.randomBytes(32));
    }
    return fs.readFileSync(VAULT_KEY_PATH);
  }

  _encrypt(payload) {
    const key = this._getVaultKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    fs.writeFileSync(SECRETS_PATH, Buffer.concat([iv, tag, encrypted]).toString('base64'));
  }

  _decrypt() {
    if (!fs.existsSync(SECRETS_PATH)) return null;
    const buf = Buffer.from(fs.readFileSync(SECRETS_PATH, 'utf8'), 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this._getVaultKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  _migrateFromEnvIfNeeded() {
    const existing = this._decrypt();
    if (existing?.ai?.apiKey) return;

    const apiKey = process.env.DOUBAO_API_KEY;
    const endpoint = process.env.DOUBAO_ENDPOINT;
    if (!apiKey || !endpoint) return;

    this.saveAiCredentials({
      apiKey,
      endpoint,
      baseUrl: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
      videoFps: Number(process.env.DOUBAO_VIDEO_FPS || 1),
    });
    console.log('[Secrets] 已从 .env 迁移 AI 密钥到本地加密保险库 (backend/data/)');
  }

  saveAiCredentials({ apiKey, endpoint, baseUrl, videoFps }) {
    const current = this._decrypt() || {};
    const next = {
      ...current,
      ai: {
        apiKey: apiKey || current.ai?.apiKey || '',
        endpoint: endpoint || current.ai?.endpoint || '',
        baseUrl: baseUrl || current.ai?.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3',
        videoFps: videoFps ?? current.ai?.videoFps ?? 1,
        updatedAt: new Date().toISOString(),
      },
    };
    this._encrypt(next);
    return this.getAiSettingsMasked();
  }

  getAiCredentials() {
    const data = this._decrypt();
    if (!data?.ai?.apiKey || !data?.ai?.endpoint) return null;
    return {
      apiKey: data.ai.apiKey,
      endpoint: data.ai.endpoint,
      baseUrl: data.ai.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3',
      videoFps: Number(data.ai.videoFps || 1),
    };
  }

  maskSecret(value) {
    if (!value) return '';
    if (value.length <= 12) return '*'.repeat(value.length);
    return `${value.slice(0, 8)}${'*'.repeat(Math.min(16, value.length - 12))}${value.slice(-4)}`;
  }

  getAiSettingsMasked() {
    const creds = this.getAiCredentials();
    if (!creds) {
      return {
        configured: false,
        endpoint: '',
        api_key_masked: '',
        base_url: 'https://ark.cn-beijing.volces.com/api/v3',
        video_fps: 1,
        storage_path: 'backend/data/secrets.vault (AES-256-GCM 加密)',
      };
    }
    return {
      configured: true,
      endpoint: creds.endpoint,
      api_key_masked: this.maskSecret(creds.apiKey),
      base_url: creds.baseUrl,
      video_fps: creds.videoFps,
      storage_path: 'backend/data/secrets.vault (AES-256-GCM 加密)',
    };
  }

  clearAiCredentials() {
    const current = this._decrypt() || {};
    delete current.ai;
    if (Object.keys(current).length === 0) {
      if (fs.existsSync(SECRETS_PATH)) fs.unlinkSync(SECRETS_PATH);
    } else {
      this._encrypt(current);
    }
  }
}

module.exports = new SecretsService();
