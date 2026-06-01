<template>
  <div class="settings-page">
    <div class="page-header">
      <el-button text @click="$router.push('/admin/videos')">← 返回视频管理</el-button>
      <h1 class="page-title">API 配置</h1>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    >
      <template #title>安全说明</template>
      <p>API Key 使用 <strong>AES-256-GCM</strong> 加密后保存在本机 <code>backend/data/</code> 目录，不会明文写入代码或 .env 文件。</p>
      <p>打包上传项目时，<code>data/</code> 和 <code>.env</code> 已在 .gitignore 中排除，不会泄露密钥。</p>
    </el-alert>

    <el-collapse v-model="activePanels" class="settings-collapse">
      <el-collapse-item name="ai">
        <template #title>
          <div class="collapse-title">
            <span>高光 / 分支文案 + 图生图（豆包 Seed 2.0 / Seedream）</span>
            <el-tag size="small" :type="settings.configured ? 'success' : 'warning'">
              {{ settings.configured ? '已配置' : '未配置' }}
            </el-tag>
          </div>
        </template>
        <div v-loading="loading" class="collapse-body">
          <el-form label-width="140px" @submit.prevent="handleSave">
            <el-form-item label="配置状态">
              <el-tag :type="settings.configured ? 'success' : 'warning'">
                {{ settings.configured ? '已配置' : '未配置' }}
              </el-tag>
              <span v-if="settings.configured" class="masked-key">
                当前 Key：{{ settings.api_key_masked }}
              </span>
            </el-form-item>

            <el-form-item label="模型 Endpoint" required>
              <el-input
                v-model="form.endpoint"
                placeholder="ep-20260514111117-s7m8b"
              />
              <div class="hint">Doubao-Seed-2.0-lite 接入点 ID</div>
            </el-form-item>

            <el-form-item label="API Key" :required="!settings.configured">
              <el-input
                v-model="form.api_key"
                type="password"
                show-password
                :placeholder="settings.configured ? '留空则不修改已有密钥' : 'ark-xxxxxxxx'"
              />
            </el-form-item>

            <el-form-item label="API 地址">
              <el-input v-model="form.base_url" placeholder="https://ark.cn-beijing.volces.com/api/v3" />
            </el-form-item>

            <el-form-item label="视频采样 FPS">
              <el-input-number v-model="form.video_fps" :min="0.3" :max="3" :step="0.1" />
              <div class="hint">视频预处理帧率，默认 1</div>
            </el-form-item>

            <el-divider>分支插图（豆包 Seedream 图生图）</el-divider>

            <el-form-item label="图生图状态">
              <el-tag :type="settings.image_configured ? 'success' : 'info'">
                {{ settings.image_configured ? '已配置' : '未配置（可选）' }}
              </el-tag>
            </el-form-item>

            <el-form-item label="图生图 Endpoint" required>
              <el-input
                v-model="form.image_endpoint"
                placeholder="ep-20260514111117-xxxxx"
              />
            </el-form-item>

            <el-form-item label="图生图 API Key">
              <el-input
                v-model="form.image_api_key"
                type="password"
                show-password
                placeholder="留空则共用上方 API Key"
              />
            </el-form-item>

            <el-form-item label="图片尺寸">
              <el-input v-model="form.image_size" placeholder="2K" />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
              <el-button :loading="testing" @click="handleTest">测试视频分析</el-button>
              <el-button :loading="imageTesting" @click="handleImageTest">测试图生图</el-button>
              <el-button type="danger" plain @click="handleClear">清除配置</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-collapse-item>

      <el-collapse-item name="doubao_tts">
        <template #title>
          <div class="collapse-title">
            <span>分支旁白配音（豆包语音 openspeech）</span>
            <el-tag size="small" :type="ttsSettings.configured ? 'success' : 'warning'">
              {{ ttsSettings.configured ? '已配置' : '未配置' }}
            </el-tag>
          </div>
        </template>
        <div v-loading="ttsLoading" class="collapse-body">
          <el-form label-width="140px">
            <el-form-item label="配置状态">
              <el-tag :type="ttsSettings.configured ? 'success' : 'warning'">
                {{ ttsSettings.configured ? '已配置' : '未配置' }}
              </el-tag>
              <span v-if="ttsSettings.configured" class="masked-key">
                Token：{{ ttsSettings.access_token_masked }}
              </span>
            </el-form-item>

            <el-form-item label="App ID" required>
              <el-input v-model="ttsForm.app_id" placeholder="控制台申请的 appid" />
            </el-form-item>

            <el-form-item label="Access Token" :required="!ttsSettings.configured">
              <el-input
                v-model="ttsForm.access_token"
                type="password"
                show-password
                :placeholder="ttsSettings.configured ? '留空则不修改' : 'access_token'"
              />
            </el-form-item>

            <el-form-item label="Cluster">
              <el-input v-model="ttsForm.cluster" placeholder="volcano_tts" />
            </el-form-item>

            <el-form-item label="默认音色">
              <el-input v-model="ttsForm.voice_type" placeholder="BV700_streaming" />
              <div class="hint">分支管理页可覆盖；复刻/训练音色填 voice_type</div>
            </el-form-item>

            <el-form-item label="API 地址">
              <el-input v-model="ttsForm.base_url" placeholder="https://openspeech.bytedance.com/api/v1/tts" />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="ttsSaving" @click="handleTtsSave">保存 TTS 配置</el-button>
              <el-button :loading="ttsTesting" @click="handleTtsTest">测试 TTS</el-button>
              <el-button type="danger" plain @click="handleTtsClear">清除 TTS 配置</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-collapse-item>

      <el-collapse-item name="siliconflow_tts">
        <template #title>
          <div class="collapse-title">
            <span>分支旁白配音（硅基流动 CosyVoice2 · 克隆音色）</span>
            <el-tag size="small" :type="sfSettings.configured ? 'success' : 'warning'">
              {{ sfSettings.configured ? '已配置' : '未配置' }}
            </el-tag>
          </div>
        </template>
        <div v-loading="sfLoading" class="collapse-body">
          <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
            兼容 <a href="https://github.com/muyouzhi6/astrbot_plugin_tts_emotion_router" target="_blank" rel="noopener">astrbot TTS 插件</a> 的 SiliconFlow 配置；voice 填克隆 ID（如 speech:xinnai:…）。
          </el-alert>
          <el-form label-width="140px">
            <el-form-item label="配置状态">
              <el-tag :type="sfSettings.configured ? 'success' : 'warning'">
                {{ sfSettings.configured ? '已配置' : '未配置' }}
              </el-tag>
              <span v-if="sfSettings.configured" class="masked-key">
                Key：{{ sfSettings.api_key_masked }}
              </span>
            </el-form-item>

            <el-form-item label="API Key" :required="!sfSettings.configured">
              <el-input
                v-model="sfForm.api_key"
                type="password"
                show-password
                :placeholder="sfSettings.configured ? '留空则不修改' : 'sk-xxxxxxxx'"
              />
            </el-form-item>

            <el-form-item label="API Base">
              <el-input v-model="sfForm.base_url" placeholder="https://api.siliconflow.cn/v1" />
            </el-form-item>

            <el-form-item label="模型">
              <el-input v-model="sfForm.model" placeholder="FunAudioLLM/CosyVoice2-0.5B" />
            </el-form-item>

            <el-form-item label="默认克隆音色" required>
              <el-input
                v-model="sfForm.voice"
                placeholder="speech:xinnai:d3mr18c50mis73c5i4gg:etpqojdghnmseewqfuup"
              />
              <div class="hint">与 astrbot voice_map.neutral 相同；分支管理页可覆盖</div>
            </el-form-item>

            <el-form-item label="音频格式">
              <el-select v-model="sfForm.format" style="width: 100%">
                <el-option label="mp3" value="mp3" />
                <el-option label="wav" value="wav" />
                <el-option label="opus" value="opus" />
              </el-select>
            </el-form-item>

            <el-form-item label="语速">
              <el-input-number v-model="sfForm.speed" :min="0.5" :max="2" :step="0.05" />
            </el-form-item>

            <el-form-item label="音量增益(dB)">
              <el-input-number v-model="sfForm.gain" :min="-10" :max="10" :step="0.5" />
              <div class="hint">astrbot 默认 0；调低可减轻电流音</div>
            </el-form-item>

            <el-form-item label="采样率">
              <el-input-number v-model="sfForm.sample_rate" :min="8000" :max="48000" :step="1000" />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="sfSaving" @click="handleSfSave">保存配置</el-button>
              <el-button :loading="sfTesting" @click="handleSfTest">测试 TTS</el-button>
              <el-button type="danger" plain @click="handleSfClear">清除配置</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getAiSettings,
  saveAiSettings,
  testAiSettings,
  testImageSettings,
  deleteAiSettings,
  getTtsSettings,
  saveTtsSettings,
  testTtsSettings,
  deleteTtsSettings,
  getSiliconflowTtsSettings,
  saveSiliconflowTtsSettings,
  testSiliconflowTtsSettings,
  deleteSiliconflowTtsSettings,
} from '@/api/admin';

const loading = ref(true);
const ttsLoading = ref(true);
const sfLoading = ref(true);
const saving = ref(false);
const ttsSaving = ref(false);
const sfSaving = ref(false);
const testing = ref(false);
const imageTesting = ref(false);
const ttsTesting = ref(false);
const sfTesting = ref(false);
const settings = ref({ configured: false });
const ttsSettings = ref({ configured: false });
const sfSettings = ref({ configured: false });
const activePanels = ref([]);
const form = ref({
  endpoint: '',
  api_key: '',
  base_url: 'https://ark.cn-beijing.volces.com/api/v3',
  video_fps: 1,
  image_endpoint: '',
  image_api_key: '',
  image_size: '2K',
});
const ttsForm = ref({
  app_id: '',
  access_token: '',
  cluster: 'volcano_tts',
  voice_type: 'BV700_streaming',
  base_url: 'https://openspeech.bytedance.com/api/v1/tts',
});
const sfForm = ref({
  api_key: '',
  base_url: 'https://api.siliconflow.cn/v1',
  model: 'FunAudioLLM/CosyVoice2-0.5B',
  format: 'mp3',
  speed: 1,
  gain: 0,
  sample_rate: 44100,
  voice: '',
});

onMounted(async () => {
  await Promise.all([loadSettings(), loadTtsSettings(), loadSfSettings()]);
});

async function loadSettings() {
  loading.value = true;
  try {
    settings.value = await getAiSettings();
    form.value.endpoint = settings.value.endpoint || '';
    form.value.base_url = settings.value.base_url || 'https://ark.cn-beijing.volces.com/api/v3';
    form.value.video_fps = settings.value.video_fps ?? 1;
    form.value.image_endpoint = settings.value.image_endpoint || settings.value.image_model || '';
    form.value.image_api_key = '';
    form.value.image_size = settings.value.image_size || '2K';
    form.value.api_key = '';
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (!form.value.endpoint) {
    ElMessage.warning('请填写 Endpoint ID');
    return;
  }
  if (!settings.value.configured && !form.value.api_key) {
    ElMessage.warning('首次配置必须填写 API Key');
    return;
  }

  saving.value = true;
  try {
    const payload = {
      endpoint: form.value.endpoint,
      base_url: form.value.base_url,
      video_fps: form.value.video_fps,
      image_endpoint: form.value.image_endpoint,
      image_size: form.value.image_size,
    };
    if (form.value.api_key) payload.api_key = form.value.api_key;
    if (form.value.image_api_key) payload.image_api_key = form.value.image_api_key;

    settings.value = await saveAiSettings(payload);
    form.value.api_key = '';
    ElMessage.success('配置已加密保存到本地');
  } finally {
    saving.value = false;
  }
}

async function handleTest() {
  testing.value = true;
  try {
    const payload = {
      endpoint: form.value.endpoint,
      base_url: form.value.base_url,
      video_fps: form.value.video_fps,
      image_endpoint: form.value.image_endpoint,
      image_size: form.value.image_size,
    };
    if (form.value.api_key) payload.api_key = form.value.api_key;
    if (form.value.image_api_key) payload.image_api_key = form.value.image_api_key;
    await testAiSettings(payload);
    ElMessage.success('API 连接测试成功');
  } finally {
    testing.value = false;
  }
}

async function handleImageTest() {
  if (!form.value.image_endpoint?.startsWith('ep-')) {
    ElMessage.warning('请先填写 Seedream 图生图 Endpoint（ep- 开头）');
    return;
  }
  if (form.value.image_endpoint === form.value.endpoint) {
    ElMessage.warning('图生图 Endpoint 不能与视频分析 Endpoint 相同');
    return;
  }
  imageTesting.value = true;
  try {
    const payload = {
      base_url: form.value.base_url,
      image_endpoint: form.value.image_endpoint,
      image_size: form.value.image_size,
    };
    if (form.value.api_key) payload.api_key = form.value.api_key;
    if (form.value.image_api_key) payload.image_api_key = form.value.image_api_key;
    await testImageSettings(payload);
    ElMessage.success('图生图连接测试成功');
  } finally {
    imageTesting.value = false;
  }
}

async function loadTtsSettings() {
  ttsLoading.value = true;
  try {
    ttsSettings.value = await getTtsSettings();
    ttsForm.value.app_id = ttsSettings.value.app_id || '';
    ttsForm.value.cluster = ttsSettings.value.cluster || 'volcano_tts';
    ttsForm.value.voice_type = ttsSettings.value.voice_type || 'BV700_streaming';
    ttsForm.value.base_url = ttsSettings.value.base_url || 'https://openspeech.bytedance.com/api/v1/tts';
    ttsForm.value.access_token = '';
  } finally {
    ttsLoading.value = false;
  }
}

async function handleTtsSave() {
  if (!ttsForm.value.app_id) {
    ElMessage.warning('请填写 App ID');
    return;
  }
  if (!ttsSettings.value.configured && !ttsForm.value.access_token) {
    ElMessage.warning('首次配置必须填写 Access Token');
    return;
  }

  ttsSaving.value = true;
  try {
    const payload = {
      app_id: ttsForm.value.app_id,
      cluster: ttsForm.value.cluster,
      voice_type: ttsForm.value.voice_type,
      base_url: ttsForm.value.base_url,
    };
    if (ttsForm.value.access_token) payload.access_token = ttsForm.value.access_token;
    ttsSettings.value = await saveTtsSettings(payload);
    ttsForm.value.access_token = '';
    ElMessage.success('TTS 配置已保存');
  } finally {
    ttsSaving.value = false;
  }
}

async function handleTtsTest() {
  ttsTesting.value = true;
  try {
    const payload = {
      app_id: ttsForm.value.app_id,
      cluster: ttsForm.value.cluster,
      voice_type: ttsForm.value.voice_type,
      base_url: ttsForm.value.base_url,
    };
    if (ttsForm.value.access_token) payload.access_token = ttsForm.value.access_token;
    await testTtsSettings(payload);
    ElMessage.success('TTS 连接测试成功');
  } finally {
    ttsTesting.value = false;
  }
}

async function handleTtsClear() {
  await ElMessageBox.confirm('确定清除 TTS 配置？', '警告', { type: 'warning' });
  await deleteTtsSettings();
  ttsForm.value = {
    app_id: '',
    access_token: '',
    cluster: 'volcano_tts',
    voice_type: 'BV700_streaming',
    base_url: 'https://openspeech.bytedance.com/api/v1/tts',
  };
  ttsSettings.value = { configured: false };
  ElMessage.success('已清除 TTS 配置');
}

async function loadSfSettings() {
  sfLoading.value = true;
  try {
    sfSettings.value = await getSiliconflowTtsSettings();
    sfForm.value.base_url = sfSettings.value.base_url || 'https://api.siliconflow.cn/v1';
    sfForm.value.model = sfSettings.value.model || 'FunAudioLLM/CosyVoice2-0.5B';
    sfForm.value.format = sfSettings.value.format || 'mp3';
    sfForm.value.speed = sfSettings.value.speed ?? 1;
    sfForm.value.gain = sfSettings.value.gain ?? 0;
    sfForm.value.sample_rate = sfSettings.value.sample_rate ?? 44100;
    sfForm.value.voice = sfSettings.value.voice || '';
    sfForm.value.api_key = '';
  } finally {
    sfLoading.value = false;
  }
}

async function handleSfSave() {
  if (!sfSettings.value.configured && !sfForm.value.api_key) {
    ElMessage.warning('首次配置必须填写 API Key');
    return;
  }
  if (!sfForm.value.voice) {
    ElMessage.warning('请填写默认克隆音色 voice');
    return;
  }

  sfSaving.value = true;
  try {
    const payload = {
      base_url: sfForm.value.base_url,
      model: sfForm.value.model,
      format: sfForm.value.format,
      speed: sfForm.value.speed,
      gain: sfForm.value.gain,
      sample_rate: sfForm.value.sample_rate,
      voice: sfForm.value.voice,
    };
    if (sfForm.value.api_key) payload.api_key = sfForm.value.api_key;
    sfSettings.value = await saveSiliconflowTtsSettings(payload);
    sfForm.value.api_key = '';
    ElMessage.success('硅基流动 TTS 配置已保存');
  } finally {
    sfSaving.value = false;
  }
}

async function handleSfTest() {
  if (!sfForm.value.voice) {
    ElMessage.warning('请先填写默认克隆音色 voice');
    return;
  }
  sfTesting.value = true;
  try {
    const payload = {
      base_url: sfForm.value.base_url,
      model: sfForm.value.model,
      format: sfForm.value.format,
      speed: sfForm.value.speed,
      gain: sfForm.value.gain,
      sample_rate: sfForm.value.sample_rate,
      voice: sfForm.value.voice,
    };
    if (sfForm.value.api_key) payload.api_key = sfForm.value.api_key;
    await testSiliconflowTtsSettings(payload);
    ElMessage.success('硅基流动 TTS 连接测试成功');
  } finally {
    sfTesting.value = false;
  }
}

async function handleSfClear() {
  await ElMessageBox.confirm('确定清除硅基流动 TTS 配置？', '警告', { type: 'warning' });
  await deleteSiliconflowTtsSettings();
  sfForm.value = {
    api_key: '',
    base_url: 'https://api.siliconflow.cn/v1',
    model: 'FunAudioLLM/CosyVoice2-0.5B',
    format: 'mp3',
    speed: 1,
    gain: 0,
    sample_rate: 44100,
    voice: '',
  };
  sfSettings.value = { configured: false };
  ElMessage.success('已清除硅基流动 TTS 配置');
}

async function handleClear() {
  await ElMessageBox.confirm('确定清除本地保存的 API 配置？', '警告', { type: 'warning' });
  await deleteAiSettings();
  form.value = {
    endpoint: '',
    api_key: '',
    base_url: 'https://ark.cn-beijing.volces.com/api/v3',
    video_fps: 1,
    image_endpoint: '',
    image_size: '1280x720',
  };
  settings.value = { configured: false };
  ElMessage.success('已清除');
}
</script>

<style scoped>
.settings-page { max-width: 720px; margin: 0 auto; width: 100%; }
.page-header { margin-bottom: 20px; }
.page-header .page-title { margin-top: 8px; }
.settings-collapse {
  width: 100%;
  border: none;
}
.settings-collapse :deep(.el-collapse-item) {
  margin-bottom: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-card-border-radius, 4px);
  background-color: var(--el-bg-color);
  box-shadow: var(--el-box-shadow-light);
  overflow: hidden;
}
.settings-collapse :deep(.el-collapse-item:last-child) {
  margin-bottom: 0;
}
.settings-collapse :deep(.el-collapse-item__header) {
  height: auto;
  min-height: 56px;
  line-height: 1.5;
  padding: 18px 20px;
  border-bottom: none;
  background-color: var(--el-fill-color-blank);
  font-size: inherit;
}
.settings-collapse :deep(.el-collapse-item.is-active > .el-collapse-item__header) {
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.settings-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}
.settings-collapse :deep(.el-collapse-item__content) {
  padding: 0;
}
.collapse-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  gap: 12px;
  font-weight: 500;
  padding-right: 8px;
}
.collapse-body { padding: 20px; }
.hint { font-size: 12px; color: #999; margin-top: 4px; }
.masked-key { margin-left: 12px; font-size: 13px; color: #666; font-family: monospace; }
.storage-path { font-size: 13px; color: #666; }
code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
</style>
