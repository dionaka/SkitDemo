<template>
  <div class="home">
    <HomeTopNav
      :scroll-y="scrollY"
      @avatar="$router.push('/settings')"
      @search="onSearchTap"
    />

    <div
      class="nav-spacer"
      :style="{ height: `calc(${homeTheme.navHeight} + var(--safe-top))` }"
    />

    <div v-if="!hasServer" class="card setup-card">
      <div class="empty-icon">🔗</div>
      <p class="setup-text">请先配置服务器地址<br />才能浏览短剧内容</p>
      <button class="btn btn-primary" @click="$router.push('/settings')">去设置</button>
    </div>

    <template v-else>
      <HomeCategoryBar v-model="activeCategory" :pinned="scrollY > 72" />

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

      <div v-else-if="displaySeries.length === 0" class="empty-state">
        <div class="empty-icon">📺</div>
        暂无短剧<br />请在管理后台上传并发布
      </div>

      <section v-else class="section">
        <div class="section-header">
          <h2 class="section-title">{{ categoryTitle }}</h2>
          <span class="section-more">共 {{ displaySeries.length }} 部</span>
        </div>
        <div class="poster-grid">
          <div
            v-for="s in displaySeries"
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
import { homeTheme } from '@/config/homeTheme';
import { getSeriesList } from '@/api/series';
import { getContinueWatching } from '@/api/watchProgress';
import { useSessionStore } from '@/stores/session';
import { formatProgressLabel } from '@/utils/watchProgress';
import { useHomeScroll } from '@/composables/useHomeScroll';
import SeriesCover from '@/components/SeriesCover.vue';
import HomeTopNav from '@/components/home/HomeTopNav.vue';
import HomeCategoryBar from '@/components/home/HomeCategoryBar.vue';

const session = useSessionStore();
const { scrollY } = useHomeScroll();
const seriesList = ref([]);
const continueList = ref([]);
const loading = ref(true);
const error = ref('');
const activeCategory = ref('hot');

const hasServer = computed(() => Boolean(getApiBaseUrl()));

const displaySeries = computed(() => {
  const list = [...seriesList.value];
  if (activeCategory.value === 'latest') {
    return list.sort((a, b) => (b.id || 0) - (a.id || 0));
  }
  if (activeCategory.value === 'recommend') {
    return [...list].reverse();
  }
  return list;
});

const categoryTitle = computed(() => {
  const map = { hot: '热门短剧', recommend: '为你推荐', latest: '最新上架' };
  return map[activeCategory.value] || '热门短剧';
});

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

function onSearchTap() {
  // 预留搜索入口，后续可接搜索页
}
</script>

<style scoped>
.home {
  padding-bottom: 8px;
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
