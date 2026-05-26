<template>
  <div class="settings-page">
    <div class="page-header">
      <el-button text @click="$router.push('/admin/videos')">← 返回视频管理</el-button>
      <h1 class="page-title">豆包 API 配置</h1>
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

    <el-card v-loading="loading">
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

        <el-form-item label="存储位置">
          <span class="storage-path">{{ settings.storage_path }}</span>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
          <el-button :loading="testing" @click="handleTest">测试连接</el-button>
          <el-button type="danger" plain @click="handleClear">清除配置</el-button>
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
  deleteAiSettings,
} from '@/api/admin';

const loading = ref(true);
const saving = ref(false);
const testing = ref(false);
const settings = ref({ configured: false });
const form = ref({
  endpoint: '',
  api_key: '',
  base_url: 'https://ark.cn-beijing.volces.com/api/v3',
  video_fps: 1,
});

onMounted(loadSettings);

async function loadSettings() {
  loading.value = true;
  try {
    settings.value = await getAiSettings();
    form.value.endpoint = settings.value.endpoint || '';
    form.value.base_url = settings.value.base_url || 'https://ark.cn-beijing.volces.com/api/v3';
    form.value.video_fps = settings.value.video_fps ?? 1;
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
    };
    if (form.value.api_key) payload.api_key = form.value.api_key;

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
    };
    if (form.value.api_key) payload.api_key = form.value.api_key;
    await testAiSettings(payload);
    ElMessage.success('API 连接测试成功');
  } finally {
    testing.value = false;
  }
}

async function handleClear() {
  await ElMessageBox.confirm('确定清除本地保存的 API 配置？', '警告', { type: 'warning' });
  await deleteAiSettings();
  form.value = { endpoint: '', api_key: '', base_url: 'https://ark.cn-beijing.volces.com/api/v3', video_fps: 1 };
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
