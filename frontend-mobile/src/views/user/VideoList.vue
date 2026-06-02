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
        ref="categoryBarRef"
        :model-value="activeCategory"
        :pinned="scrollY > 56"
        @update:model-value="onCategoryPick"
      />

      <section v-if="showContinueWatching && continueList.length" class="section continue-section">
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

      <div ref="swiperRef" class="category-swiper">
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
              <h2 class="section-title">{{ titleFor(cat.id) }}</h2>
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
import { getHomePreferences } from '@/utils/homePreferences';
import { useHomeScroll } from '@/composables/useHomeScroll';
import {
  useHomeScrollRestore,
  registerHomeScrollContext,
  flushHomeScrollCapture,
} from '@/composables/useHomeScrollRestore';
import { useCategorySwiper } from '@/composables/useCategorySwiper';

defineOptions({ name: 'VideoList' });
import SeriesCover from '@/components/SeriesCover.vue';
import HomeTopNav from '@/components/home/HomeTopNav.vue';
import HomeCategoryBar from '@/components/home/HomeCategoryBar.vue';

const session = useSessionStore();
const backgroundStore = useAppBackgroundStore();
const skinStore = useSkinStore();
const router = useRouter();
const { scrollY } = useHomeScroll();
const seriesList = ref([]);
const continueList = ref([]);
const loading = ref(true);
const error = ref('');
const activeCategory = ref('hot');
const categoryBarRef = ref(null);
const toast = ref('');
const shakingSeriesId = ref(null);
const showContinueWatching = ref(getHomePreferences().showContinueWatching);

const LONG_PRESS_MS = 550;
let longPressTimer = null;
let longPressTriggered = false;
let touchStartX = 0;
let touchStartY = 0;
let confirmOpen = false;

const { swiperRef, scrollToCategory, initSwiper } = useCategorySwiper(homeCategories, activeCategory);

registerHomeScrollContext({
  getCategoryId: () => activeCategory.value,
  scrollToCategory: (id, smooth = false) => scrollToCategory(id, smooth),
});
useHomeScrollRestore();

const hasServer = computed(() => Boolean(apiBaseUrl.value));

async function loadData(options = {}) {
  const { silent = false } = options;
  if (!hasServer.value) {
    loading.value = false;
    return;
  }
  if (!silent) loading.value = true;
  error.value = '';
  try {
    const [seriesData, continueData] = await Promise.all([
      getSeriesList(),
      showContinueWatching.value
        ? getContinueWatching(session.userSessionId).catch(() => ({ list: [] }))
        : Promise.resolve({ list: [] }),
    ]);
    seriesList.value = seriesData.list || [];
    continueList.value = continueData.list || [];
  } catch (e) {
    error.value = e.message || '加载失败';
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

function seriesFor(categoryId) {
  const list = [...seriesList.value];
  if (categoryId === 'latest') {
    return list.sort((a, b) => (b.id || 0) - (a.id || 0));
  }
  if (categoryId === 'recommend') {
    return [...list].reverse();
  }
  return list;
}

function titleFor(categoryId) {
  const map = { hot: '热门短剧', recommend: '为你推荐', latest: '最新上架' };
  return map[categoryId] || '热门短剧';
}

onMounted(loadData);

watch(apiBaseUrl, (url) => {
  if (url) loadData();
});

onActivated(() => {
  if (!hasServer.value) return;
  showContinueWatching.value = getHomePreferences().showContinueWatching;
  if (seriesList.value.length === 0 && !loading.value) {
    loadData();
    return;
  }
  if (!showContinueWatching.value) return;
  getContinueWatching(session.userSessionId)
    .then((data) => { continueList.value = data.list || []; })
    .catch(() => {});
});

watch(() => skinStore.refreshToken, (token, prev) => {
  if (token === prev || token === 0) return;
  runRefresh();
});

function onCategoryPick(id) {
  activeCategory.value = id;
  scrollToCategory(id);
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

.category-swiper {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: auto;
  margin: 0 -16px;
  min-height: calc(100dvh - var(--tab-height) - var(--safe-bottom) - var(--home-chrome-top));
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
}

.category-swiper.smooth-scroll {
  scroll-behavior: smooth;
}

.category-swiper::-webkit-scrollbar {
  display: none;
}

.swiper-page {
  flex: 0 0 100%;
  width: 100%;
  min-height: 100%;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  padding: 0 16px;
  box-sizing: border-box;
  content-visibility: auto;
  contain-intrinsic-size: auto 480px;
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
