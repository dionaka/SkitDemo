<template>
  <div class="home" :style="{ '--home-nav-height': homeTheme.navHeight }">
    <HomeTopNav
      :scroll-y="scrollY"
      :theme="navTheme"
      :has-skin-bg="hasSkinNavBg"
      @profile="onProfileTap"
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
      <!-- 刷新动效：固定叠在「一」底与「二」顶之间，不挤占二三部分高度 -->
      <div
        class="home-refresh-float"
        :class="{ pulling: isPulling, refreshing: isRefreshing }"
        :style="refreshFloatStyle"
      >
        <SkinRefreshEffect
          :pull-distance="pullDistance"
          :is-pulling="isPulling"
          :is-refreshing="isRefreshing"
          :pull-threshold="pullThreshold"
        />
      </div>

      <HomeCategoryBar
        v-if="!offlineOnlyMode"
        ref="categoryBarRef"
        :model-value="activeCategory"
        :pinned="scrollY > 56"
        @pick="onCategoryPick"
      />

      <div v-if="isEffectivelyOffline && hasServer" class="offline-banner card">
        <span class="offline-banner-icon">📡</span>
        <div>
          <p class="offline-banner-title">当前无网络</p>
          <p class="offline-banner-desc">
            {{ offlineCompleted.length ? '在线榜单不可用，请播放下方已缓存分集' : '请先在联网时下载剧集，或检查网络连接' }}
          </p>
        </div>
      </div>

      <HomeOfflineSection
        v-if="isEffectivelyOffline && offlineCompleted.length"
        :items="offlineCompleted"
        :is-online="!isEffectivelyOffline"
        @play="openOfflineItem"
      />

      <section v-if="showContinueWatching && continueList.length && !offlineOnlyMode" class="section continue-section">
        <div class="section-header continue-header">
          <h2 class="section-title">继续观看</h2>
          <button type="button" class="continue-clear-btn" @click="clearAllContinue">清空记录</button>
        </div>
        <div class="continue-scroll">
          <div
            v-for="item in continueList"
            :key="item.video_id"
            class="continue-item"
            :class="{ shaking: shakingSeriesId === item.series_id }"
            @click="onContinueClick(item)"
            @touchstart.passive="onContinueTouchStart(item, $event)"
            @touchmove.passive="onContinueTouchMove"
            @touchend="onContinueTouchEnd"
            @touchcancel="onContinueTouchEnd"
            @contextmenu.prevent="confirmRemoveContinue(item)"
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

      <div v-if="toast" class="home-toast">{{ toast }}</div>

      <div v-if="!offlineOnlyMode" ref="swiperRef" class="category-viewport">
        <div class="category-track" :style="trackStyle">
          <div
            v-for="cat in homeCategories"
            :key="cat.id"
            class="swiper-page"
          >
          <div v-if="loading" class="loading-box">
            <div class="loading-spinner" />
            <span>加载中...</span>
          </div>

          <div v-else-if="error" class="card">
            <p class="error-text">{{ error }}</p>
            <button class="btn btn-ghost" @click="loadData">重试</button>
          </div>

          <div v-else-if="seriesFor(cat.id).length === 0" class="empty-state">
            <div class="empty-icon">📺</div>
            暂无短剧<br />请在管理后台上传并发布
          </div>

          <section v-else class="section">
            <div class="section-header">
              <div class="section-heading">
                <h2 class="section-title">{{ titleFor(cat.id) }}</h2>
                <p v-if="subtitleFor(cat.id)" class="section-subtitle">{{ subtitleFor(cat.id) }}</p>
              </div>
              <span class="section-more">共 {{ seriesFor(cat.id).length }} 部</span>
            </div>
            <div class="poster-grid">
              <div
                v-for="s in seriesFor(cat.id)"
                :key="s.id"
                class="poster-card"
                @click="openSeries(s.id)"
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
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, nextTick, watch, defineOptions } from 'vue';
import { useRouter } from 'vue-router';
import { apiBaseUrl } from '@/config/server';
import { homeTheme, homeCategories } from '@/config/homeTheme';
import { getSeriesList } from '@/api/series';
import { getContinueWatching, removeContinueSeries, clearContinueWatching } from '@/api/watchProgress';
import { useSessionStore } from '@/stores/session';
import { useAppBackgroundStore } from '@/stores/appBackground';
import { useSkinStore, SkinRefreshEffect, useHomeSkinRefresh } from '@/skin';
import { formatProgressLabel, clearLocalProgressBatch } from '@/utils/watchProgress';
import { useAppPreferencesStore } from '@/stores/appPreferences';
import { storeToRefs } from 'pinia';
import { useHomeScroll } from '@/composables/useHomeScroll';
import {
  useHomeScrollRestore,
  registerHomeScrollContext,
  flushHomeScrollCapture,
} from '@/composables/useHomeScrollRestore';
import { useCategorySwiper } from '@/composables/useCategorySwiper';
import { useNetworkStatus, probeNetworkReachable, markNetworkUnreachable, markNetworkReachable } from '@/composables/useNetworkStatus';
import { useOfflineCacheStore } from '@/stores/offlineCache';

defineOptions({ name: 'VideoList' });
import SeriesCover from '@/components/SeriesCover.vue';
import HomeTopNav from '@/components/home/HomeTopNav.vue';
import HomeCategoryBar from '@/components/home/HomeCategoryBar.vue';
import HomeOfflineSection from '@/components/home/HomeOfflineSection.vue';

const HOME_LIST_SIZE = 50;

function emptyCategoryLists() {
  return Object.fromEntries(homeCategories.map((cat) => [cat.id, []]));
}

const session = useSessionStore();
const appPrefs = useAppPreferencesStore();
const offlineCache = useOfflineCacheStore();
const { showContinueWatching, categorySwipeSensitivity } = storeToRefs(appPrefs);
const { completedItems: offlineCompleted } = storeToRefs(offlineCache);
const { isEffectivelyOffline } = useNetworkStatus();
const backgroundStore = useAppBackgroundStore();
const skinStore = useSkinStore();
const router = useRouter();
const { scrollY } = useHomeScroll();
const seriesByCategory = ref(emptyCategoryLists());
const continueList = ref([]);
const loading = ref(true);
const error = ref('');
const activeCategory = ref('hot');
const categoryBarRef = ref(null);
const toast = ref('');
const shakingSeriesId = ref(null);

const LONG_PRESS_MS = 550;
let longPressTimer = null;
let longPressTriggered = false;
let touchStartX = 0;
let touchStartY = 0;
let confirmOpen = false;

const { swiperRef, trackStyle, selectCategory, initSwiper } = useCategorySwiper(
  homeCategories,
  activeCategory,
  categorySwipeSensitivity,
);

registerHomeScrollContext({
  getCategoryId: () => activeCategory.value,
  scrollToCategory: (id) => selectCategory(id),
});
useHomeScrollRestore();

const hasServer = computed(() => Boolean(apiBaseUrl.value));
const offlineOnlyMode = computed(() => isEffectivelyOffline.value && offlineCompleted.value.length > 0);

function seriesFor(categoryId) {
  return seriesByCategory.value[categoryId] || [];
}

function hasLoadedSeries() {
  return homeCategories.some((cat) => seriesFor(cat.id).length > 0);
}

async function fetchCategoryList(categoryId) {
  const data = await getSeriesList(
    1,
    HOME_LIST_SIZE,
    categoryId,
    session.userSessionId,
  );
  return data.list || [];
}

async function loadSeriesCategories() {
  const results = await Promise.all(
    homeCategories.map((cat) =>
      fetchCategoryList(cat.id).catch(() => []),
    ),
  );
  const next = emptyCategoryLists();
  homeCategories.forEach((cat, index) => {
    next[cat.id] = results[index];
  });
  seriesByCategory.value = next;
}

async function refreshRecommendCategory() {
  if (!hasServer.value) return;
  try {
    seriesByCategory.value.recommend = await fetchCategoryList('recommend');
  } catch {
    // keep previous recommend list
  }
}

async function loadData(options = {}) {
  const { silent = false } = options;
  if (!hasServer.value) {
    loading.value = false;
    return;
  }
  if (!silent) loading.value = true;
  error.value = '';
  try {
    const [, continueData] = await Promise.all([
      loadSeriesCategories(),
      showContinueWatching.value
        ? getContinueWatching(session.userSessionId).catch(() => ({ list: [] }))
        : Promise.resolve({ list: [] }),
    ]);
    continueList.value = continueData.list || [];
    markNetworkReachable();
  } catch (e) {
    markNetworkUnreachable();
    if (isEffectivelyOffline.value && offlineCompleted.value.length) {
      error.value = '';
    } else {
      error.value = e.message || '加载失败';
    }
  } finally {
    if (!silent) loading.value = false;
    if (hasServer.value) {
      nextTick(() => initSwiper());
    }
  }
}

const {
  pullDistance,
  isPulling,
  isRefreshing,
  runRefresh,
  floatTravel,
} = useHomeSkinRefresh(() => loadData({ silent: true }));

const pullThreshold = 56;

const refreshFloatStyle = computed(() => {
  const travel = floatTravel;
  const offset = isRefreshing.value
    ? travel
    : Math.max(0, Math.min(travel, pullDistance.value));
  return {
    transform: `translateY(${offset - travel}px)`,
    opacity: offset > 3 || isRefreshing.value ? 1 : 0,
  };
});

const hasSkinNavBg = computed(() => Boolean(skinStore.topNavTheme?.navBackgroundImage));

const navTheme = computed(() => {
  const theme = { ...homeTheme };
  const skinNav = skinStore.topNavTheme;
  const colors = skinStore.themeColors;

  if (skinNav?.navBackgroundImage) {
    theme.navBackgroundImage = skinNav.navBackgroundImage;
  } else if (backgroundStore.navBackgroundImage) {
    theme.navBackgroundImage = backgroundStore.navBackgroundImage;
  }

  if (skinNav?.navBackgroundGradient) {
    theme.navBackgroundGradient = skinNav.navBackgroundGradient;
  } else if (colors?.accent) {
    theme.navAccentGlow = colors.accent.startsWith('#')
      ? `${colors.accent}88`
      : homeTheme.navAccentGlow;
    theme.navBackgroundGradient = `linear-gradient(145deg, ${colors.pubTop || colors.tabBg} 0%, ${colors.tabBg} 45%, #07070d 100%)`;
  }

  if (skinNav?.navAccentGlow) theme.navAccentGlow = skinNav.navAccentGlow;
  if (skinNav?.navMeshColor) theme.navMeshColor = skinNav.navMeshColor;

  return theme;
});

function titleFor(categoryId) {
  const map = { hot: '热门短剧', recommend: '为你推荐', latest: '最新上架' };
  return map[categoryId] || '热门短剧';
}

function subtitleFor(categoryId) {
  const map = {
    hot: '按点赞、收藏与观看热度排序',
    recommend: '结合你的观看与互动偏好推荐',
    latest: '按上架时间从新到旧',
  };
  return map[categoryId] || '';
}

onMounted(async () => {
  offlineCache.hydrate();
  if (hasServer.value) await probeNetworkReachable(apiBaseUrl.value);
  loadData();
});

watch(apiBaseUrl, async (url) => {
  if (url) {
    await probeNetworkReachable(url);
    loadData();
  }
});

watch(isEffectivelyOffline, (offline) => {
  if (!offline && hasServer.value) loadData();
});

onActivated(async () => {
  offlineCache.hydrate();
  if (hasServer.value) await probeNetworkReachable(apiBaseUrl.value);
  if (!hasServer.value) return;
  appPrefs.hydrate();
  if (!hasLoadedSeries() && !loading.value) {
    loadData();
    return;
  }
  refreshRecommendCategory();
  if (!showContinueWatching.value) {
    continueList.value = [];
    return;
  }
  getContinueWatching(session.userSessionId)
    .then((data) => { continueList.value = data.list || []; })
    .catch(() => {});
});

watch(() => session.userSessionId, () => {
  if (!hasServer.value) return;
  refreshRecommendCategory();
});

watch(showContinueWatching, (enabled) => {
  if (!hasServer.value) return;
  if (!enabled) {
    continueList.value = [];
    return;
  }
  getContinueWatching(session.userSessionId)
    .then((data) => { continueList.value = data.list || []; })
    .catch(() => {});
});

watch(() => skinStore.refreshToken, (token, prev) => {
  if (token === prev || token === 0) return;
  runRefresh();
});

function onCategoryPick(id) {
  selectCategory(id);
  categoryBarRef.value?.scrollActiveIntoView();
}

function formatProgress(item) {
  return formatProgressLabel(item.position_seconds, item.total_duration) || '继续播放';
}

function openSeries(id) {
  flushHomeScrollCapture();
  router.push(`/series/${id}`);
}

function openPlay(videoId) {
  flushHomeScrollCapture();
  router.push(`/play/${videoId}`);
}

function openOfflineItem(item) {
  flushHomeScrollCapture();
  router.push(`/play/${item.videoId}`);
}

function showToast(msg) {
  toast.value = msg;
  setTimeout(() => { toast.value = ''; }, 2200);
}

function onContinueClick(item) {
  if (longPressTriggered) {
    longPressTriggered = false;
    return;
  }
  openPlay(item.video_id);
}

function onContinueTouchStart(item, e) {
  longPressTriggered = false;
  const touch = e.touches?.[0];
  if (!touch) return;
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  clearTimeout(longPressTimer);
  longPressTimer = setTimeout(() => {
    longPressTriggered = true;
    shakingSeriesId.value = item.series_id;
    if (navigator.vibrate) navigator.vibrate(20);
    confirmRemoveContinue(item);
    setTimeout(() => {
      if (shakingSeriesId.value === item.series_id) shakingSeriesId.value = null;
    }, 400);
  }, LONG_PRESS_MS);
}

function onContinueTouchMove(e) {
  const touch = e.touches?.[0];
  if (!touch) return;
  const dx = Math.abs(touch.clientX - touchStartX);
  const dy = Math.abs(touch.clientY - touchStartY);
  if (dx > 10 || dy > 10) clearTimeout(longPressTimer);
}

function onContinueTouchEnd() {
  clearTimeout(longPressTimer);
}

async function confirmRemoveContinue(item) {
  if (confirmOpen) return;
  confirmOpen = true;
  const ok = window.confirm(`删除「${item.series_title}」的播放记录？`);
  confirmOpen = false;
  if (!ok) return;
  try {
    const data = await removeContinueSeries(item.series_id, session.userSessionId);
    clearLocalProgressBatch(data.video_ids);
    continueList.value = continueList.value.filter((row) => row.series_id !== item.series_id);
    showToast('播放记录已删除');
  } catch (e) {
    showToast(e.message || '移除失败');
  }
}

async function clearAllContinue() {
  if (!continueList.value.length) return;
  const ok = window.confirm('确定删除全部播放记录？');
  if (!ok) return;
  try {
    const data = await clearContinueWatching(session.userSessionId);
    clearLocalProgressBatch(data.video_ids);
    continueList.value = [];
    showToast('播放记录已清空');
  } catch (e) {
    showToast(e.message || '清空失败');
  }
}

function onSearchTap() {
  router.push('/search');
}

function onProfileTap() {
  router.push('/profile');
}
</script>

<style scoped>
.home {
  --home-chrome-top: calc(76px + var(--safe-top) + 54px);
  padding-bottom: 8px;
}

/* 叠在顶栏下缘，从「一」底滑出盖在「二」上；不占文档流高度 */
.home-refresh-float {
  position: fixed;
  left: 0;
  right: 0;
  top: calc(var(--home-nav-height, 76px) + var(--safe-top));
  z-index: 55;
  display: flex;
  justify-content: center;
  pointer-events: none;
  will-change: transform, opacity;
  transition: opacity 0.12s ease;
}

.home-refresh-float.pulling {
  transition: none;
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
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-right: 16px;
  margin-bottom: 12px;
}

.section-heading {
  flex: 1;
  min-width: 0;
}

.section-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
}

.continue-section {
  margin-bottom: 16px;
}

.continue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 16px;
}

.continue-clear-btn {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
}

.continue-clear-btn:active {
  color: var(--accent);
}

.offline-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.offline-banner-icon {
  font-size: 22px;
  line-height: 1;
}

.offline-banner-title {
  font-size: 14px;
  font-weight: 700;
}

.offline-banner-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.category-viewport {
  overflow: hidden;
  margin: 0 -16px;
  min-height: calc(100dvh - var(--tab-height) - var(--safe-bottom) - var(--home-chrome-top));
  touch-action: pan-x pan-y;
  overscroll-behavior-x: none;
}

.category-track {
  display: flex;
  width: 100%;
  will-change: transform;
}

.swiper-page {
  flex: 0 0 100%;
  width: 100%;
  min-height: 100%;
  padding: 0 16px;
  box-sizing: border-box;
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
  -webkit-user-select: none;
  user-select: none;
  touch-action: manipulation;
}

.continue-item.shaking {
  animation: continue-shake 0.35s ease;
}

@keyframes continue-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
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

.home-toast {
  position: fixed;
  left: 50%;
  bottom: calc(var(--tab-height) + var(--safe-bottom) + 24px);
  transform: translateX(-50%);
  z-index: 200;
  background: rgba(20, 20, 28, 0.92);
  color: #fff;
  font-size: 13px;
  padding: 10px 18px;
  border-radius: 20px;
  pointer-events: none;
  max-width: 80vw;
  text-align: center;
}

</style>
