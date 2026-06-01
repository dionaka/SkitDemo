<template>
  <div class="series-page">
    <div v-if="loading" class="loading-box">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>

    <template v-else-if="series">
      <PageBackBar label="返回" @back="goBack" />

      <!-- Hero banner -->
      <div class="series-hero">
        <SeriesCover
          class="hero-cover"
          variant="banner"
          :cover-url="series.cover_url"
          :title="series.title"
        />
        <div class="hero-overlay" />
        <div class="hero-content">
          <div class="hero-info">
            <h1 class="hero-name">{{ series.title }}</h1>
            <p class="hero-ep-count">全 {{ episodes.length }} 集</p>
          </div>
          <SeriesEngagementBar
            v-if="series.id"
            :series-id="series.id"
            variant="hero"
            @toast="showToast"
          />
        </div>
      </div>

      <div v-if="toast" class="toast">{{ toast }}</div>

      <div v-if="episodes.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        该剧暂无已发布分集
      </div>

      <div v-else class="episode-list">
        <div
          v-for="ep in episodes"
          :key="ep.id"
          class="episode-row"
          @click="$router.push(`/play/${ep.id}`)"
        >
          <div class="ep-badge">{{ ep.episode_number }}</div>
          <div class="ep-content">
            <div class="ep-title">{{ ep.title }}</div>
            <div class="ep-meta">
              <span>{{ formatDuration(ep.total_duration) }}</span>
              <span class="ep-dot">·</span>
              <span>{{ ep.highlight_count }} 个高光</span>
            </div>
            <div v-if="progressLabel(ep)" class="ep-progress-label">{{ progressLabel(ep) }}</div>
            <div v-if="progressPercent(ep) > 0" class="progress-track">
              <div class="progress-fill" :style="{ width: progressPercent(ep) + '%' }" />
            </div>
          </div>
          <div class="ep-play-btn">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <PageBackBar label="返回" @back="goBack" />
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        {{ error || '短剧不存在' }}
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageBackBar from '@/components/PageBackBar.vue';
import { getSeriesEpisodes } from '@/api/series';
import { useSessionStore } from '@/stores/session';
import { smartBack } from '@/utils/navigation';
import { formatProgressLabel, getLocalProgress } from '@/utils/watchProgress';
import SeriesCover from '@/components/SeriesCover.vue';
import SeriesEngagementBar from '@/components/SeriesEngagementBar.vue';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const loading = ref(true);
const error = ref('');
const series = ref(null);
const episodes = ref([]);
const progressMap = ref({});
const toast = ref('');

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
      progressMap.value[ep.id] = Math.max(getLocalProgress(ep.id), progressMap.value[ep.id] || 0);
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

function showToast(msg) {
  toast.value = msg;
  setTimeout(() => { toast.value = ''; }, 2200);
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
.series-page {
  padding: 16px;
  padding-top: 8px;
  min-height: 100vh;
  background: var(--bg-base);
}

.series-hero {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  height: 180px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-card);
}

.hero-cover {
  position: absolute;
  inset: 0;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.1) 60%);
}

.hero-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 18px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  z-index: 1;
}

.hero-info {
  flex: 1;
  min-width: 0;
}

.hero-name {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  line-height: 1.3;
  letter-spacing: -0.3px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hero-ep-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4px;
}

.episode-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.episode-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s;
}

.episode-row:active {
  background: var(--bg-card-hover);
}

.ep-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 15px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ep-content {
  flex: 1;
  min-width: 0;
}

.ep-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ep-meta {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}

.ep-dot {
  opacity: 0.5;
}

.ep-progress-label {
  font-size: 11px;
  color: var(--accent);
  margin-top: 5px;
}

.ep-play-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(255, 77, 109, 0.3);
}

.ep-play-btn svg {
  width: 16px;
  height: 16px;
  color: #fff;
  margin-left: 2px;
}
</style>
