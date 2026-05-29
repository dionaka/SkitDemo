<template>
  <div class="home">
    <!-- Hero -->
    <div class="hero">
      <div class="hero-glow" />
      <h1 class="hero-title">短剧互动</h1>
      <p class="hero-sub">发现精彩 · 参与剧情</p>
    </div>

    <div v-if="!hasServer" class="card setup-card">
      <div class="empty-icon">🔗</div>
      <p class="setup-text">请先配置服务器地址<br />才能浏览短剧内容</p>
      <button class="btn btn-primary" @click="$router.push('/settings')">去设置</button>
    </div>

    <template v-else>
      <!-- Continue watching - horizontal scroll -->
      <section v-if="continueList.length" class="section">
        <div class="section-header">
          <h2 class="section-title">继续观看</h2>
        </div>
        <div class="continue-scroll">
          <div
            v-for="item in continueList"
            :key="item.video_id"
            class="continue-item"
            @click="$router.push(`/play/${item.video_id}`)"
          >
            <SeriesCover
              class="continue-poster"
              variant="thumb"
              :cover-url="item.series_cover_url"
              :title="item.series_title"
            >
              <span class="continue-play">▶</span>
              <div class="continue-ep-tag">第{{ item.episode_number }}集</div>
            </SeriesCover>
            <div class="continue-name">{{ item.series_title }}</div>
            <div class="continue-progress-text">{{ formatProgress(item) }}</div>
          </div>
        </div>
      </section>

      <div v-if="loading" class="loading-box">
        <div class="loading-spinner" />
        <span>加载中...</span>
      </div>

      <div v-else-if="error" class="card">
        <p class="error-text">{{ error }}</p>
        <button class="btn btn-ghost" @click="loadData">重试</button>
      </div>

      <div v-else-if="seriesList.length === 0" class="empty-state">
        <div class="empty-icon">📺</div>
        暂无短剧<br />请在管理后台上传并发布
      </div>

      <section v-else class="section">
        <div class="section-header">
          <h2 class="section-title">热门短剧</h2>
          <span class="section-more">共 {{ seriesList.length }} 部</span>
        </div>
        <div class="poster-grid">
          <div
            v-for="s in seriesList"
            :key="s.id"
            class="poster-card"
            @click="$router.push(`/series/${s.id}`)"
          >
            <SeriesCover
              class="poster-cover"
              variant="poster"
              :cover-url="s.cover_url"
              :title="s.title"
            >
              <span class="poster-ep-badge">{{ s.episode_count }}集</span>
            </SeriesCover>
            <div class="poster-title">{{ s.title }}</div>
          </div>
        </div>
      </section>
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
import SeriesCover from '@/components/SeriesCover.vue';

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
  return formatProgressLabel(item.position_seconds, item.total_duration) || '继续播放';
}
</script>

<style scoped>
.home {
  padding-bottom: 8px;
}

.hero {
  position: relative;
  padding: 8px 0 24px;
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  top: -40px;
  right: -30px;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, rgba(255, 77, 109, 0.25) 0%, transparent 70%);
  pointer-events: none;
}

.hero-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.setup-card {
  text-align: center;
  padding: 32px 20px;
}

.setup-text {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.section {
  margin-bottom: 28px;
}

.continue-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin: 0 -16px;
  padding-left: 16px;
  padding-right: 16px;
  scrollbar-width: none;
}

.continue-scroll::-webkit-scrollbar {
  display: none;
}

.continue-item {
  flex-shrink: 0;
  width: 110px;
  cursor: pointer;
}

.continue-item:active {
  opacity: 0.85;
}

.continue-poster {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.continue-play {
  position: absolute;
  z-index: 2;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.continue-ep-tag {
  position: absolute;
  z-index: 2;
  bottom: 6px;
  left: 6px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
}

.continue-name {
  font-size: 12px;
  font-weight: 600;
  margin-top: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.continue-progress-text {
  font-size: 10px;
  color: var(--accent);
  margin-top: 2px;
}
</style>
