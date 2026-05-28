<template>
  <div>
    <h1 class="page-title">服务器设置</h1>

    <div class="card">
      <div class="field">
        <label>后端地址</label>
        <input
          v-model="serverUrl"
          type="url"
          placeholder="http://192.168.1.100:8080"
          autocapitalize="off"
          autocorrect="off"
        />
      </div>

      <p class="hint">
        填写你电脑在局域网中的 IP 和端口，例如
        <code>http://192.168.1.100:8080</code>。<br />
        手机和电脑需在同一 WiFi；后端在本机运行且防火墙放行 8080 端口。
      </p>

      <p v-if="error" class="error-text">{{ error }}</p>
      <p v-if="success" class="success-text">{{ success }}</p>

      <button class="btn btn-primary" :disabled="testing" @click="saveAndTest">
        {{ testing ? '连接中...' : '保存并测试连接' }}
      </button>
    </div>

    <div class="card" style="margin-top:16px">
      <h3 style="font-size:15px;margin-bottom:8px">如何查看电脑 IP</h3>
      <p class="hint">
        Windows：打开 CMD，输入 <code>ipconfig</code>，查看「IPv4 地址」。<br />
        Android 模拟器调试可使用 <code>http://10.0.2.2:8080</code>。
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { getApiBaseUrl, setApiBaseUrl } from '@/config/server';

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
    error.value = '请输入后端地址';
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
      success.value = '连接成功！返回短剧列表即可浏览。';
      serverUrl.value = url;
    } else {
      error.value = '服务器响应异常';
    }
  } catch (e) {
    error.value = e.message || '无法连接，请检查 IP、端口和后端是否已启动';
  } finally {
    testing.value = false;
  }
}
</script>
