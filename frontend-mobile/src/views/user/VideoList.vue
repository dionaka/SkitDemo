<template>
  <div>
    <h1 class="page-title">短剧列表</h1>

    <div v-if="!hasServer" class="card">
      <p class="hint">请先配置后端服务器地址，才能加载短剧列表。</p>
      <button class="btn btn-primary" style="margin-top:12px" @click="$router.push('/settings')">
        去设置
      </button>
    </div>

    <template v-else>
      <div v-if="continueList.length" class="continue-section">
        <h2 class="section-title">继续观看</h2>
        <div class="continue-list">
          <div
            v-for="item in continueList"
            :key="item.video_id"
            class="continue-card"
            @click="$router.push(`/play/${item.video_id}`)"
          >
            <div class="continue-cover">▶</div>
            <div class="continue-info">
              <div class="continue-series">{{ item.series_title }}</div>
              <div class="continue-ep">第 {{ item.episode_number }} 集 · {{ item.title }}</div>
              <div class="continue-progress">{{ formatProgress(item) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loading" class="loading-box">加载中...</div>
      <div v-else-if="error" class="card">
        <p class="error-text">{{ error }}</p>
        <button class="btn btn-text" @click="loadData">重试</button>
      </div>
      <div v-else-if="seriesList.length === 0" class="empty">
        暂无短剧<br />请在本机管理后台上传并发布视频
      </div>
      <div v-else class="video-grid">
        <div
          v-for="s in seriesList"
          :key="s.id"
          class="video-card"
          @click="$router.push(`/series/${s.id}`)"
        >
          <div class="cover">🎬</div>
          <div class="info">
            <div class="title">{{ s.title }}</div>
            <div class="meta">共 {{ s.episode_count }} 集</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getApiBaseUrl } from '@/config/server';
import { getSeriesList } from '@/api/series';
import { getContinueWatching } from '@/api/watchProgress';
import { useSessionStore } from '@/stores/session';
import { formatProgressLabel } from '@/utils/watchProgress';

const session = useSessionStore();
const seriesList = ref([]);
const continueList = ref([]);
const loading = ref(true);
const error = ref('');

const hasServer = computed(() => Boolean(getApiBaseUrl()));

onMounted(loadData);

async function loadData() {
  if (!hasServer.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const [seriesData, continueData] = await Promise.all([
      getSeriesList(),
      getContinueWatching(session.userSessionId).catch(() => ({ list: [] })),
    ]);
    seriesList.value = seriesData.list || [];
    continueList.value = continueData.list || [];
  } catch (e) {
    error.value = e.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

function formatProgress(item) {
  return formatProgressLabel(item.position_seconds, item.total_duration);
}
</script>

<style scoped>
.continue-section { margin-bottom: 20px; }
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 10px; }
.continue-list { display: flex; flex-direction: column; gap: 10px; }
.continue-card {
  display: flex; gap: 12px; padding: 12px; background: #1a1a2e;
  border-radius: 12px; border: 1px solid #2a2a40; cursor: pointer;
}
.continue-card:active { background: #252540; }
.continue-cover {
  width: 48px; height: 48px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, #e94560, #764ba2);
  display: flex; align-items: center; justify-content: center; color: #fff;
}
.continue-series { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.continue-ep { font-size: 12px; color: #888; margin-bottom: 4px; }
.continue-progress { font-size: 11px; color: #e94560; }
</style>
