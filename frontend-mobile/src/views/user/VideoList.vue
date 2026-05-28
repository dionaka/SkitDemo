<template>
  <div>
    <h1 class="page-title">短剧列表</h1>

    <div v-if="!hasServer" class="card">
      <p class="hint">请先配置后端服务器地址，才能加载短剧列表。</p>
      <button class="btn btn-primary" style="margin-top:12px" @click="$router.push('/settings')">
        去设置
      </button>
    </div>

    <div v-else-if="loading" class="loading-box">加载中...</div>
    <div v-else-if="error" class="card">
      <p class="error-text">{{ error }}</p>
      <button class="btn btn-text" @click="loadVideos">重试</button>
      <button class="btn btn-text" @click="$router.push('/settings')">检查服务器设置</button>
    </div>
    <div v-else-if="videos.length === 0" class="empty">
      暂无短剧<br />请在本机管理后台上传并发布视频
    </div>
    <div v-else class="video-grid">
      <div
        v-for="v in videos"
        :key="v.id"
        class="video-card"
        @click="$router.push(`/play/${v.id}`)"
      >
        <div class="cover">🎬</div>
        <div class="info">
          <div class="title">{{ v.title }}</div>
          <div class="meta">{{ formatDuration(v.total_duration) }} · {{ v.highlight_count }} 个高光</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getApiBaseUrl } from '@/config/server';
import { getVideoList } from '@/api/video';

const videos = ref([]);
const loading = ref(true);
const error = ref('');

const hasServer = computed(() => Boolean(getApiBaseUrl()));

onMounted(loadVideos);

async function loadVideos() {
  if (!hasServer.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const data = await getVideoList();
    videos.value = data.list || [];
  } catch (e) {
    error.value = e.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${s}秒`;
}
</script>
