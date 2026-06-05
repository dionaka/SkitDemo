<template>

  <div class="play-page" :class="{ immersive: true }">

    <div v-if="loading" class="loading-box">加载中...</div>



    <template v-else-if="video">

      <PageBackBar v-show="!playerFullscreen" :label="backLabel" @back="goBack" />

      <div v-show="!playerFullscreen" class="play-header">
        <div class="play-header-top">
          <div class="play-header-info">
            <h2>{{ video.series_title }} · 第 {{ video.episode_number }} 集</h2>
            <p class="ep-subtitle">{{ video.title }}</p>
            <p v-if="resumeHint" class="resume-hint">{{ resumeHint }}</p>
            <p v-if="isOfflinePlayback" class="resume-hint offline-tag">离线播放</p>
          </div>
          <div class="play-header-actions">
            <SeriesEngagementBar
              v-if="video.series_id"
              :series-id="video.series_id"
              variant="inline"
              @toast="showToast"
            />
            <OfflineDownloadButton
              v-if="video.video_url"
              compact
              :video-id="video.id"
              :series-id="video.series_id"
              :series-title="video.series_title"
              :episode-number="video.episode_number"
              :title="video.title"
              :cover-url="video.cover_url"
              :video-url="video.video_url"
              @toast="showToast"
            />
          </div>
        </div>

        <div class="play-prefs">
          <label class="pref-item">
            <input v-model="prefs.highlightEnabled" type="checkbox" @change="savePrefs" />
            <span>高光互动</span>
          </label>
          <label class="pref-item">
            <input v-model="prefs.branchEnabled" type="checkbox" @change="savePrefs" />
            <span>剧情分支</span>
          </label>
          <label class="pref-item">
            <input v-model="prefs.danmakuEnabled" type="checkbox" @change="savePrefs" />
            <span>弹幕</span>
          </label>
        </div>
      </div>



      <VideoPlayer

        ref="playerRef"

        :src="playbackUrl"

        :highlights="effectiveHighlights"
        :branch-points="effectiveBranchPoints"
        :start-time="startTime"
        :overlay-visible="panelVisible || branchPanelVisible"
        :segment-visible="branchSegmentVisible"
        :danmaku-enabled="prefs.danmakuEnabled"
        :danmaku-items="danmakuList"

        @highlight-reached="onHighlightReached"
        @branch-reached="onBranchReached"

        @timeupdate="onTimeUpdate"

        @pause="onPause"

        @duration="onVideoDuration"

        @fullscreen-change="playerFullscreen = $event"
        @overlay-dismiss="onOverlayDismiss"

      >
        <template #overlay>
          <InteractionPanel
            v-if="panelVisible"
            :visible="panelVisible"
            :highlight="currentHighlight"
            :stats="interactionStats"
            :selected="hasSelected"
            :mode="panelMode"
            :selected-option="selectedOption"
            :countdown-progress="countdownProgress"
            :countdown-seconds="countdownSeconds"
            @select="onSelectOption"
            @dismiss="closePanel"
          />
          <BranchChoicePanel
            v-if="branchPanelVisible"
            :visible="branchPanelVisible"
            :title="currentBranchPoint?.title"
            :choices="branchChoices"
            :stats="branchStats"
            :loading="branchChoosing"
            @select="onBranchSelect"
            @dismiss="closeBranchPanel"
          />
        </template>
        <template #segment>
          <BranchSegmentPlayer
            v-if="branchSegmentVisible"
            :asset="branchPlayback.asset"
            @segment-ended="onBranchSegmentEnded"
          />
        </template>
      </VideoPlayer>

      <DanmakuSendBar
        v-if="video && !isOfflinePlayback"
        v-show="!playerFullscreen"
        :logged-in="session.isLoggedIn"
        :disabled="!prefs.danmakuEnabled"
        @send="onSendDanmaku"
      />

      <div v-if="highlights.length" v-show="!playerFullscreen" class="highlight-list card">

        <h3>高光点时间轴</h3>

        <div class="hl-items">

          <div

            v-for="h in highlights"

            :key="h.id"

            class="hl-item"

            :class="h.category"

            @click="playerRef?.jumpTo(h.timestamp)"

          >

            <span class="hl-time">{{ formatTime(h.timestamp) }}</span>

            <span class="hl-title">{{ h.title }}</span>

            <span class="hl-tag" :style="{ background: getCategoryColor(h.category) }">{{ getCategoryLabel(h.category) }}</span>

          </div>

        </div>

      </div>

      <div v-if="branchPoints.length" v-show="!playerFullscreen" class="highlight-list card branch-list">

        <h3>剧情分支点</h3>

        <div class="hl-items">

          <div

            v-for="b in branchPoints"

            :key="b.id"

            class="hl-item branch-item"

            @click="seekBranchPoint(b)"

          >

            <span class="hl-time">{{ formatTime(b.timestamp) }}</span>

            <span class="hl-title">{{ b.title }}</span>

            <span class="hl-tag branch-tag">分支</span>

          </div>

        </div>

      </div>

      <VideoCommentSection
        v-if="video?.id"
        v-show="!playerFullscreen"
        :video-id="video.id"
        @toast="showToast"
      />

    </template>

    <div v-else-if="!loading" class="play-empty">
      <PageBackBar label="返回" @back="goBack" />
      <p>{{ loadError || '视频不存在或未发布' }}</p>
    </div>



    <div v-if="toast" class="toast">{{ toast }}</div>

  </div>

</template>




<script setup>

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

import { useRoute, useRouter } from 'vue-router';

import VideoPlayer from '@/components/VideoPlayer/VideoPlayer.vue';

import InteractionPanel from '@/components/InteractionPanel/InteractionPanel.vue';
import BranchChoicePanel from '@/branch/components/BranchChoicePanel.vue';
import BranchSegmentPlayer from '@/branch/components/BranchSegmentPlayer.vue';
import { getBranchPointDetail, chooseBranchPoint, getBranchPointStats } from '@/api/branchPoint';

import PageBackBar from '@/components/PageBackBar.vue';
import SeriesEngagementBar from '@/components/SeriesEngagementBar.vue';
import OfflineDownloadButton from '@/components/offline/OfflineDownloadButton.vue';
import VideoCommentSection from '@/components/comments/VideoCommentSection.vue';
import { useOfflineCacheStore } from '@/stores/offlineCache';
import { buildVideoRecordFromCache } from '@/services/offlineCache';
import { isEffectivelyOfflineNow } from '@/composables/useNetworkStatus';

import { resolveMediaUrl } from '@/config/server';

import { getVideoDetail, syncVideoDuration } from '@/api/video';

import { recordInteraction, getInteractionStats } from '@/api/interaction';

import { getWatchProgress, saveWatchProgress } from '@/api/watchProgress';

import { useSessionStore } from '@/stores/session';

import { smartBack } from '@/utils/navigation';

import { getLocalProgress, setLocalProgress, formatProgressLabel, clampProgressSeconds } from '@/utils/watchProgress';

import { getPlayPreferences, savePlayPreferences } from '@/utils/playPreferences';
import { resolveEffectKey } from '@/utils/effectRegistry';
import { getCategoryLabel, getCategoryColor } from '@/config/highlightCategories';
import DanmakuSendBar from '@/components/danmaku/DanmakuSendBar.vue';
import { listDanmaku, sendDanmaku } from '@/api/danmaku';



const route = useRoute();

const router = useRouter();

const session = useSessionStore();
const offlineCache = useOfflineCacheStore();



const loading = ref(true);

const loadError = ref('');

const video = ref(null);

const highlights = ref([]);
const branchPoints = ref([]);
const branchPanelVisible = ref(false);
const branchSegmentVisible = ref(false);
const currentBranchPoint = ref(null);
const branchChoices = ref([]);
const branchStats = ref(null);
const branchChoosing = ref(false);
const branchPlayback = ref({ asset: null });
const resumeAfterBranch = ref(0);

const playerRef = ref(null);

const panelVisible = ref(false);

const currentHighlight = ref(null);

const interactionStats = ref(null);

const hasSelected = ref(false);

const panelMode = ref('options');

const selectedOption = ref('');

const countdownProgress = ref(0);

const countdownSeconds = ref(0);

let countdownTimer = null;

let countdownInterval = null;

const toast = ref('');

const startTime = ref(0);

const resumeHint = ref('');

const isOfflinePlayback = ref(false);

const playerFullscreen = ref(false);

const danmakuList = ref([]);

const prefs = ref(getPlayPreferences());

let lastSaveAt = 0;
/** 本次进入播放页时的起点，避免续播瞬间误刷新「最近观看」 */
let sessionBaselinePosition = 0;
const PROGRESS_ADVANCE_SECONDS = 3;
const MIN_SAVE_SECONDS = 5;



const playbackUrl = ref('');

watch(
  () => [video.value?.id, video.value?.video_url],
  async () => {
    const current = video.value;
    if (!current) {
      playbackUrl.value = '';
      return;
    }
    const cached = await offlineCache.ensurePlayUrl(current.id);
    playbackUrl.value = cached || resolveMediaUrl(current.video_url || '');
  },
  { immediate: true },
);

const videoId = computed(() => Number(route.params.id));

const backLabel = computed(() => (video.value?.series_id ? '返回选集' : '返回列表'));

const effectiveHighlights = computed(() => (prefs.value.highlightEnabled ? highlights.value : []));

const effectiveBranchPoints = computed(() => (prefs.value.branchEnabled ? branchPoints.value : []));



onMounted(loadVideo);



async function loadVideo() {

  loading.value = true;

  loadError.value = '';

  video.value = null;
  danmakuList.value = [];

  isOfflinePlayback.value = false;

  if (isEffectivelyOfflineNow()) {

    const ok = await tryLoadFromOfflineCache();

    loading.value = false;

    if (!ok) loadError.value = '当前无网络，且该集未缓存到本机';

    return;

  }

  try {

    const data = await getVideoDetail(route.params.id);

    video.value = data.video;

    highlights.value = data.highlights || [];
    branchPoints.value = data.branch_points || [];
    await loadDanmaku();



    const local = getLocalProgress(videoId.value);

    let remote = 0;

    try {

      const progress = await getWatchProgress(videoId.value, session.userSessionId);

      remote = progress.position_seconds || 0;

    } catch { /* ignore */ }



    const total = Number(video.value.total_duration) || 0;
    const resume = clampProgressSeconds(Math.max(local, remote), total);

    sessionBaselinePosition = resume >= MIN_SAVE_SECONDS ? resume : 0;

    if (resume >= MIN_SAVE_SECONDS) {

      startTime.value = resume;

      resumeHint.value = `将从 ${formatProgressLabel(resume, total)} 继续播放`;

    }

  } catch (e) {

    const ok = await tryLoadFromOfflineCache();

    if (!ok) loadError.value = e.message || '加载失败';

  } finally {

    loading.value = false;

  }

}

async function tryLoadFromOfflineCache() {

  const cached = offlineCache.getItem(videoId.value);

  if (!cached || cached.status !== 'completed') return false;

  const playUrl = await offlineCache.ensurePlayUrl(videoId.value);

  if (!playUrl) {

    loadError.value = '缓存文件已丢失，请联网后重新下载';

    return false;

  }

  video.value = buildVideoRecordFromCache(cached);

  highlights.value = [];

  branchPoints.value = [];
  danmakuList.value = [];

  isOfflinePlayback.value = true;

  const local = getLocalProgress(videoId.value);

  sessionBaselinePosition = local >= MIN_SAVE_SECONDS ? local : 0;

  if (local >= MIN_SAVE_SECONDS) {

    startTime.value = local;

    resumeHint.value = `将从 ${formatProgressLabel(local, 0)} 继续播放`;

  }

  return true;

}



onBeforeUnmount(() => {

  flushProgress(playerRef.value?.getCurrentTime() || 0);

  stopCountdown();

});



function savePrefs() {
  savePlayPreferences(prefs.value);
  if (!prefs.value.highlightEnabled && panelVisible.value) closePanel();
  if (!prefs.value.branchEnabled && branchPanelVisible.value) closeBranchPanel();
}

async function loadDanmaku() {
  danmakuList.value = [];
  if (!video.value?.id || isOfflinePlayback.value) return;
  try {
    const data = await listDanmaku(video.value.id);
    danmakuList.value = data.list || [];
  } catch {
    danmakuList.value = [];
  }
}

async function onSendDanmaku({ content, color }) {
  if (!session.isLoggedIn || !video.value?.id || !prefs.value.danmakuEnabled) return;
  try {
    const pos = playerRef.value?.getCurrentTime?.() ?? 0;
    const created = await sendDanmaku(video.value.id, {
      content,
      color,
      position_seconds: pos,
      user_session_id: session.userSessionId,
    });
    danmakuList.value = [...danmakuList.value, created];
    showToast('弹幕已发送');
  } catch (e) {
    showToast(e.message || '发送失败');
  }
}

function pushStatsDanmaku() {
  const options = interactionStats.value?.options;
  if (!options?.length || !prefs.value.danmakuEnabled) return;
  const top = [...options].sort((a, b) => (b.percentage || 0) - (a.percentage || 0)).slice(0, 2);
  top.forEach((s, i) => {
    setTimeout(() => {
      playerRef.value?.pushDanmaku?.(`${Math.round(s.percentage || 0)}% 选了「${s.option}」`, '#ffd166');
    }, i * 450);
  });
}



async function goBack() {
  const t = playerRef.value?.getCurrentTime?.();
  if (t) await flushProgress(t);
  const fallback = video.value?.series_id ? `/series/${video.value.series_id}` : '/';
  smartBack(router, fallback);
}



async function flushProgress(seconds) {
  const total = Number(video.value?.total_duration) || 0;
  const safeSeconds = clampProgressSeconds(seconds, total);
  if (!videoId.value || safeSeconds < MIN_SAVE_SECONDS) return;

  lastSaveAt = Date.now();

  setLocalProgress(videoId.value, safeSeconds);

  try {

    await saveWatchProgress(videoId.value, {

      user_session_id: session.userSessionId,

      position_seconds: safeSeconds,

      bump_time: true,

    });

  } catch { /* silent */ }

}



function persistProgress(seconds, force = false) {
  const total = Number(video.value?.total_duration) || 0;
  const safeSeconds = clampProgressSeconds(seconds, total);
  if (!videoId.value || safeSeconds < 1) return;

  const advanced = safeSeconds - sessionBaselinePosition >= PROGRESS_ADVANCE_SECONDS;
  if (!force && !advanced) return;

  const now = Date.now();
  if (!force && now - lastSaveAt < 5000) return;

  lastSaveAt = now;

  setLocalProgress(videoId.value, safeSeconds);

  saveWatchProgress(videoId.value, {

    user_session_id: session.userSessionId,

    position_seconds: safeSeconds,

    bump_time: force,

  }).catch(() => {});

}



async function onVideoDuration(durationSeconds) {
  const rounded = Math.round(Number(durationSeconds) || 0);
  if (!video.value || rounded < 1) return;

  const stored = Number(video.value.total_duration) || 0;
  if (Math.abs(rounded - stored) <= 2) return;

  video.value.total_duration = rounded;

  const resume = clampProgressSeconds(Math.max(getLocalProgress(videoId.value), startTime.value), rounded);
  if (resume >= MIN_SAVE_SECONDS) {
    startTime.value = resume;
    sessionBaselinePosition = resume;
    resumeHint.value = `将从 ${formatProgressLabel(resume, rounded)} 继续播放`;
  }

  try {
    await syncVideoDuration(videoId.value, rounded);
  } catch { /* silent */ }
}



function onTimeUpdate(seconds) {

  persistProgress(seconds);

}



function onPause(seconds) {
  if (seconds - sessionBaselinePosition >= 1) {
    persistProgress(seconds, true);
  }
}



function showToast(msg) {

  toast.value = msg;

  setTimeout(() => { toast.value = ''; }, 2500);

}



async function onBranchReached(point) {
  if (branchSegmentVisible.value || branchPanelVisible.value) return;
  if (panelVisible.value) {
    closePanel();
  }
  playerRef.value?.confirmBranch(point.id);
  stopCountdown();
  resumeAfterBranch.value = playerRef.value?.getCurrentTime?.() || point.timestamp;
  currentBranchPoint.value = point;
  branchPanelVisible.value = true;
  try {
    const data = await getBranchPointDetail(point.id);
    currentBranchPoint.value = data.branch_point;
    branchChoices.value = data.branch_point.choices || [];
    branchStats.value = await getBranchPointStats(point.id);
  } catch {
    branchChoices.value = [];
  }
}

async function onBranchSelect(choice) {
  branchChoosing.value = true;
  try {
    const result = await chooseBranchPoint(currentBranchPoint.value.id, {
      choice_id: choice.id,
      user_session_id: session.userSessionId,
    });
    branchPanelVisible.value = false;
    branchPlayback.value = { asset: result.asset };
    branchSegmentVisible.value = true;
    playerRef.value?.pause?.();
    showToast(`已选择「${result.choice.option_label}」`);
  } finally {
    branchChoosing.value = false;
  }
}

function closeBranchPanel() {
  branchPanelVisible.value = false;
  if (currentBranchPoint.value?.id) {
    playerRef.value?.clearBranchTrigger(currentBranchPoint.value.id);
  }
}

function onBranchSegmentEnded() {
  branchSegmentVisible.value = false;
  branchPlayback.value = { asset: null };
  playerRef.value?.jumpTo?.(resumeAfterBranch.value);
  playerRef.value?.play?.();
}

function onHighlightReached(highlight) {
  if (branchPanelVisible.value || branchSegmentVisible.value) return;

  playerRef.value?.confirmHighlight(highlight.id);
  currentHighlight.value = highlight;

  interactionStats.value = null;

  panelVisible.value = true;

  hasSelected.value = false;

  panelMode.value = 'options';

  selectedOption.value = '';

  loadStats(highlight.id);

  startCountdown(5000, () => {
    if (!hasSelected.value) closePanel();
  });

}



async function onSelectOption(option) {
  if (!currentHighlight.value || hasSelected.value) return;

  stopCountdown();

  hasSelected.value = true;

  selectedOption.value = option;

  panelMode.value = 'result';


  try {

    await recordInteraction({

      highlight_id: currentHighlight.value.id,

      user_session_id: session.userSessionId,

      selected_option: option,
    });

    playerRef.value?.playEffect(
      resolveEffectKey(currentHighlight.value),
      currentHighlight.value.effect_config || {},
    );

    await loadStats(currentHighlight.value.id);

    startCountdown(3000, closePanel);

  } catch (e) {

    hasSelected.value = false;

    panelMode.value = 'options';

    selectedOption.value = '';

    showToast(e.message || '提交失败');

    startCountdown(5000, () => {
      if (!hasSelected.value) closePanel();
    });

  }

}


async function loadStats(highlightId) {

  interactionStats.value = await getInteractionStats(highlightId);

}

function closePanel() {
  const showStats = panelMode.value === 'result' && interactionStats.value?.options?.length;
  panelVisible.value = false;
  stopCountdown();
  if (currentHighlight.value?.id) {
    playerRef.value?.clearHighlightTrigger?.(currentHighlight.value.id);
  }
  if (showStats) pushStatsDanmaku();
}

function onOverlayDismiss() {
  if (panelVisible.value) closePanel();
  else if (branchPanelVisible.value) closeBranchPanel();
}

function seekBranchPoint(b) {
  playerRef.value?.jumpToBranch?.(b.timestamp, b.id);
}

function stopCountdown() {
  if (countdownTimer) {
    clearTimeout(countdownTimer);
    countdownTimer = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  countdownProgress.value = 0;
  countdownSeconds.value = 0;
}

function startCountdown(ms, onDone) {
  stopCountdown();
  if (!ms || ms <= 0) return;
  const endAt = Date.now() + ms;

  const tick = () => {
    const remaining = Math.max(0, endAt - Date.now());
    countdownProgress.value = remaining / ms;
    countdownSeconds.value = Math.ceil(remaining / 1000);
    if (remaining <= 0) {
      stopCountdown();
      onDone?.();
    }
  };

  tick();
  countdownInterval = setInterval(tick, 80);
  countdownTimer = setTimeout(() => {
    tick();
  }, ms);
}




function formatTime(sec) {

  const m = Math.floor(sec / 60);

  const s = sec % 60;

  return `${m}:${String(s).padStart(2, '0')}`;

}




</script>



<style scoped>

.play-page.immersive {
  padding: 16px;
  padding-top: 12px;
  min-height: 100vh;
  background: #000;
}

.play-header { margin-bottom: 14px; }

.play-header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.play-header-info {
  flex: 1;
  min-width: 0;
}

.play-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.play-header h2 {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: -0.2px;
}

.ep-subtitle { color: var(--text-secondary); font-size: 13px; margin-top: 4px; }

.resume-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  font-size: 12px;
  margin-top: 8px;
  background: var(--accent-soft);
  padding: 4px 10px;
  border-radius: 8px;
}

.play-empty { text-align: center; color: var(--text-secondary); padding: 48px 16px; }

.play-prefs {

  display: flex;

  gap: 16px;

  margin-top: 10px;

  flex-wrap: wrap;

}

.pref-item {

  display: inline-flex;

  align-items: center;

  gap: 6px;

  font-size: 12px;

  color: var(--text-secondary);

  cursor: pointer;

  user-select: none;

}

.pref-item input { accent-color: var(--accent); }

.highlight-list {
  margin-top: 20px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--border);
}

.highlight-list h3 {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-secondary);
}

.hl-items { display: flex; flex-direction: column; gap: 8px; }

.hl-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--bg-base);
  border: 1px solid var(--border);
  cursor: pointer;
}

.hl-item:active { background: var(--bg-card-hover); }

.hl-time { font-weight: 700; color: var(--accent); min-width: 44px; font-size: 13px; font-variant-numeric: tabular-nums; }

.hl-title { flex: 1; font-size: 14px; }

.hl-tag { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 8px; color: #fff; white-space: nowrap; }

.hl-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  color: #fff;
  flex-shrink: 0;
}

.branch-list { margin-top: 12px; }

.branch-item { border-left: 3px solid #5352ed; }

.branch-tag { background: #5352ed !important; }

</style>

