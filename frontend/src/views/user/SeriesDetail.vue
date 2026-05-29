<template>
  <div>
    <div v-if="loading" v-loading="true" style="height:300px" />

    <template v-else-if="series">
      <PageBackBar label="返回短剧列表" @back="goBack" />

      <SeriesCover
        class="series-banner"
        variant="banner"
        :cover-url="series.cover_url"
        :title="series.title"
      />

      <h1 class="page-title">{{ series.title }}</h1>
      <p class="series-meta">共 {{ episodes.length }} 集</p>

      <div v-if="episodes.length === 0" class="empty">该剧暂无已发布分集</div>
      <div v-else class="episode-list">
        <div
          v-for="ep in episodes"
          :key="ep.id"
          class="episode-card"
          @click="$router.push(`/play/${ep.id}`)"
        >
          <div class="ep-num">第 {{ ep.episode_number }} 集</div>
          <div class="ep-body">
            <div class="ep-title">{{ ep.title }}</div>
            <div class="ep-meta">
              {{ formatDuration(ep.total_duration) }} · {{ ep.highlight_count }} 个高光
            </div>
            <div v-if="progressLabel(ep)" class="ep-progress">{{ progressLabel(ep) }}</div>
            <div v-if="progressPercent(ep) > 0" class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercent(ep) + '%' }" />
            </div>
          </div>
          <div class="ep-play">▶</div>
        </div>
      </div>
    </template>

    <template v-else>
      <PageBackBar label="返回短剧列表" @back="goBack" />
      <div class="empty">{{ error || '短剧不存在' }}</div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageBackBar from '@/components/PageBackBar.vue';
import SeriesCover from '@/components/SeriesCover.vue';
import { getSeriesEpisodes } from '@/api/series';
import { useSessionStore } from '@/stores/session';
import { smartBack } from '@/utils/navigation';
import { formatProgressLabel, getLocalProgress } from '@/utils/watchProgress';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const loading = ref(true);
const error = ref('');
const series = ref(null);
const episodes = ref([]);
const progressMap = ref({});

watch(() => route.params.id, loadData, { immediate: true });

async function loadData() {
  loading.value = true;
  error.value = '';
  series.value = null;
  episodes.value = [];
  try {
    const data = await getSeriesEpisodes(route.params.id, session.userSessionId);
    series.value = data.series;
    episodes.value = data.episodes || [];
    progressMap.value = data.progress_map || {};
    episodes.value.forEach((ep) => {
      const local = getLocalProgress(ep.id);
      const remote = progressMap.value[ep.id] || 0;
      progressMap.value[ep.id] = Math.max(local, remote);
    });
  } catch (e) {
    error.value = e.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

function goBack() {
  smartBack(router, '/');
}

function getProgress(ep) {
  return progressMap.value[ep.id] || 0;
}

function progressPercent(ep) {
  if (!ep.total_duration) return 0;
  return Math.min(100, Math.round((getProgress(ep) / ep.total_duration) * 100));
}

function progressLabel(ep) {
  return formatProgressLabel(getProgress(ep), ep.total_duration);
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${s}秒`;
}
</script>

<style scoped>
.series-banner { margin-bottom: 16px; }
.series-meta { color: #888; margin: -12px 0 20px; font-size: 14px; }
.episode-list { display: flex; flex-direction: column; gap: 10px; }
.episode-card {
  display: flex; align-items: center; gap: 14px; padding: 14px 16px;
  background: #fff; border-radius: 12px; cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: transform 0.15s;
}
.episode-card:hover { transform: translateY(-2px); }
.ep-num {
  width: 72px; flex-shrink: 0; font-weight: 700; color: #e94560; font-size: 14px;
}
.ep-body { flex: 1; min-width: 0; }
.ep-title { font-weight: 600; margin-bottom: 4px; }
.ep-meta { font-size: 12px; color: #999; }
.ep-progress { font-size: 12px; color: #e94560; margin-top: 4px; }
.progress-bar {
  height: 4px; background: #eee; border-radius: 2px; margin-top: 8px; overflow: hidden;
}
.progress-fill { height: 100%; background: #e94560; border-radius: 2px; }
.ep-play { color: #ccc; font-size: 18px; }
.empty { text-align: center; color: #999; padding: 40px 16px; }
</style>
