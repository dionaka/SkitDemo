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

    <el-card v-loading="loading" style="margin-bottom: 20px">
      <template #header>高光 / 分支文案分析（豆包 Seed 2.0）</template>
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
    </el-card>

    <el-card v-loading="ttsLoading">
      <template #header>分支旁白配音（豆包语音 openspeech）</template>
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
    </el-card>
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
} from '@/api/admin';

const loading = ref(true);
const ttsLoading = ref(true);
const saving = ref(false);
const ttsSaving = ref(false);
const testing = ref(false);
const imageTesting = ref(false);
const ttsTesting = ref(false);
const settings = ref({ configured: false });
const ttsSettings = ref({ configured: false });
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

onMounted(async () => {
  await Promise.all([loadSettings(), loadTtsSettings()]);
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
.settings-page { max-width: 720px; margin: 0 auto; }
.page-header { margin-bottom: 20px; }
.page-header .page-title { margin-top: 8px; }
.hint { font-size: 12px; color: #999; margin-top: 4px; }
.masked-key { margin-left: 12px; font-size: 13px; color: #666; font-family: monospace; }
.storage-path { font-size: 13px; color: #666; }
code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
</style>
