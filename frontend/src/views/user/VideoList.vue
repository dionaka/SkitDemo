<template>
  <div>
    <h1 class="page-title">短剧列表</h1>

    <div v-if="continueList.length" class="continue-section">
      <div class="section-header">
        <h2 class="section-title">继续观看</h2>
        <span class="section-more">{{ continueList.length }} 部</span>
      </div>
      <div class="continue-scroll">
        <div
          v-for="item in continueList"
          :key="item.video_id"
          class="continue-card"
          @click="$router.push(`/play/${item.video_id}`)"
        >
          <SeriesCover
            variant="thumb"
            :cover-url="item.series_cover_url"
            :title="item.series_title"
          />
          <div class="continue-info">
            <div class="continue-series">{{ item.series_title }}</div>
            <div class="continue-ep">第 {{ item.episode_number }} 集</div>
            <div class="continue-progress">{{ formatProgress(item) }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" v-loading="true" style="height:200px" />
    <div v-else-if="seriesList.length === 0" class="empty">暂无短剧，请先在管理后台上传</div>
    <div v-else-if="seriesList.length" class="video-grid">
      <div
        v-for="s in seriesList"
        :key="s.id"
        class="video-card"
        @click="$router.push(`/series/${s.id}`)"
      >
        <SeriesCover variant="card" :cover-url="s.cover_url" :title="s.title">
          <span class="ep-badge">{{ s.episode_count }} 集</span>
        </SeriesCover>
        <div class="info">
          <div class="title">{{ s.title }}</div>
          <div class="meta">共 {{ s.episode_count }} 集</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated } from 'vue';
import SeriesCover from '@/components/SeriesCover.vue';
import { getSeriesList } from '@/api/series';
import { getContinueWatching } from '@/api/watchProgress';
import { useSessionStore } from '@/stores/session';
import { formatProgressLabel } from '@/utils/watchProgress';

const session = useSessionStore();
const seriesList = ref([]);
const continueList = ref([]);
const loading = ref(true);

onMounted(loadData);

onActivated(() => {
  getContinueWatching(session.userSessionId)
    .then((data) => { continueList.value = data.list || []; })
    .catch(() => {});
});

async function loadData() {
  loading.value = true;
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
}

function formatProgress(item) {
  return formatProgressLabel(item.position_seconds, item.total_duration);
}
</script>

<style scoped>
.empty { text-align: center; color: #999; padding: 60px; }
.continue-section { margin-bottom: 28px; }
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-title { font-size: 16px; font-weight: 600; }
.section-more { font-size: 12px; color: #999; }
.continue-scroll {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 6px;
  scrollbar-width: thin;
  scrollbar-color: #ddd transparent;
}
.continue-scroll::-webkit-scrollbar {
  height: 4px;
}
.continue-scroll::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 2px;
}
.continue-card {
  flex-shrink: 0;
  width: 200px;
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: transform 0.15s;
}
.continue-card:hover { transform: translateY(-2px); }
.continue-info { min-width: 0; flex: 1; display: flex; flex-direction: column; justify-content: center; }
.continue-series {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.continue-ep { font-size: 12px; color: #666; margin-bottom: 4px; }
.continue-progress { font-size: 12px; color: #e94560; }
.ep-badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
}
</style>
