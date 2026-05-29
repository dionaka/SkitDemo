<template>
  <div>
    <h1 class="page-title">短剧列表</h1>

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

    <div v-if="loading" v-loading="true" style="height:200px" />
    <div v-else-if="seriesList.length === 0" class="empty">暂无短剧，请先在管理后台上传</div>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getSeriesList } from '@/api/series';
import { getContinueWatching } from '@/api/watchProgress';
import { useSessionStore } from '@/stores/session';
import { formatProgressLabel } from '@/utils/watchProgress';

const session = useSessionStore();
const seriesList = ref([]);
const continueList = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const [seriesData, continueData] = await Promise.all([
      getSeriesList(),
      getContinueWatching(session.userSessionId).catch(() => ({ list: [] })),
    ]);
    seriesList.value = seriesData.list || [];
    continueList.value = continueData.list || [];
  } finally {
    loading.value = false;
  }
});

function formatProgress(item) {
  return formatProgressLabel(item.position_seconds, item.total_duration);
}
</script>

<style scoped>
.empty { text-align: center; color: #999; padding: 60px; }
.continue-section { margin-bottom: 28px; }
.section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.continue-list { display: flex; flex-direction: column; gap: 10px; }
.continue-card {
  display: flex; gap: 14px; padding: 12px 16px; background: #fff;
  border-radius: 12px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: transform 0.15s;
}
.continue-card:hover { transform: translateY(-2px); }
.continue-cover {
  width: 56px; height: 56px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, #e94560, #764ba2);
  display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20px;
}
.continue-series { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
.continue-ep { font-size: 13px; color: #666; margin-bottom: 4px; }
.continue-progress { font-size: 12px; color: #e94560; }
</style>
