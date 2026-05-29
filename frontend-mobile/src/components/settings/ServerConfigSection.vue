<template>
  <SettingsSection title="连接设置" description="配置后端服务器地址">
    <div class="card">
      <div class="field">
        <label>服务器地址</label>
        <input
          v-model="serverUrl"
          type="url"
          placeholder="http://192.168.1.100:8080"
          autocapitalize="off"
          autocorrect="off"
        />
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>
      <p v-if="success" class="success-text">✓ {{ success }}</p>

      <button class="btn btn-primary" :disabled="testing" @click="saveAndTest">
        {{ testing ? '连接中...' : '保存并测试' }}
      </button>
    </div>

    <div class="tips-card">
      <div class="tips-title">💡 使用提示</div>
      <ul class="tips-list">
        <li>填写电脑局域网 IP，如 <code>http://192.168.1.100:8080</code></li>
        <li>手机与电脑需在同一 WiFi</li>
        <li>模拟器使用 <code>http://10.0.2.2:8080</code></li>
        <li>云服务器填写公网地址，如 <code>http://你的IP:8080</code></li>
      </ul>
    </div>
  </SettingsSection>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { getApiBaseUrl, setApiBaseUrl } from '@/config/server';
import SettingsSection from './SettingsSection.vue';

const serverUrl = ref('');
const testing = ref(false);
const error = ref('');
const success = ref('');

onMounted(() => {
  serverUrl.value = getApiBaseUrl();
});

async function saveAndTest() {
  error.value = '';
  success.value = '';

  const url = setApiBaseUrl(serverUrl.value);
  if (!url) {
    error.value = '请输入服务器地址';
    return;
  }
  if (!/^https?:\/\/.+/i.test(url)) {
    error.value = '地址需以 http:// 或 https:// 开头';
    return;
  }

  testing.value = true;
  try {
    const res = await axios.get(`${url}/api/health`, { timeout: 8000 });
    if (res.data?.status === 'ok') {
      success.value = '连接成功！';
      serverUrl.value = url;
    } else {
      error.value = '服务器响应异常';
    }
  } catch (e) {
    error.value = e.message || '无法连接，请检查地址和后端是否已启动';
  } finally {
    testing.value = false;
  }
}
</script>

<style scoped>
.tips-card {
  margin-top: 16px;
  padding: 18px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.tips-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-secondary);
}

.tips-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tips-list li {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
  padding-left: 14px;
  position: relative;
}

.tips-list li::before {
  content: '·';
  position: absolute;
  left: 0;
  color: var(--accent);
  font-weight: 700;
}

.tips-list code {
  color: var(--accent);
  font-size: 11px;
  background: var(--accent-soft);
  padding: 1px 5px;
  border-radius: 4px;
}
</style>
