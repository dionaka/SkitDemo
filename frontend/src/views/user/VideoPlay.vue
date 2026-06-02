<template>
  <div class="play-page">
    <div v-if="loading" v-loading="true" style="height:400px" />

    <template v-else-if="video">
      <PageBackBar :label="backLabel" @back="goBack" />
      <div class="play-header">
        <h2>{{ video.series_title }} · 第 {{ video.episode_number }} 集</h2>
        <p class="ep-subtitle">{{ video.title }}</p>
        <p v-if="resumeHint" class="resume-hint">{{ resumeHint }}</p>
        <div class="play-prefs">
          <label class="pref-item">
            <input v-model="prefs.highlightEnabled" type="checkbox" @change="savePrefs" />
            <span>高光互动</span>
          </label>
          <label class="pref-item">
            <input v-model="prefs.branchEnabled" type="checkbox" @change="savePrefs" />
            <span>剧情分支</span>
          </label>
        </div>
      </div>

      <VideoPlayer
        ref="playerRef"
        :src="videoUrl"
        :highlights="effectiveHighlights"
        :branch-points="effectiveBranchPoints"
        :start-time="startTime"
        :overlay-visible="panelVisible || branchPanelVisible"
        :segment-visible="branchSegmentVisible"
        @highlight-reached="onHighlightReached"
        @branch-reached="onBranchReached"
        @timeupdate="onTimeUpdate"
        @pause="onPause"
        @duration="onVideoDuration"
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
            @select="onSelectOption"
            @dismiss="closePanel"
          />
          <BranchChoicePanel
            v-if="branchPanelVisible"
            :visible="branchPanelVisible"
            :title="currentBranchPoint?.title || '剧情分叉'"
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

      <div v-if="highlights.length" class="highlight-list">
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
            <span class="hl-tag">{{ categoryLabel(h.category) }}</span>
          </div>
        </div>
      </div>

      <div v-if="branchPoints.length" class="highlight-list branch-list">
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
    </template>

    <div v-else-if="!loading" class="play-empty">
      <PageBackBar label="返回" @back="goBack" />
      <p>{{ loadError || '视频不存在或未发布' }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import VideoPlayer from '@/components/VideoPlayer/VideoPlayer.vue';
import InteractionPanel from '@/components/InteractionPanel/InteractionPanel.vue';
import BranchChoicePanel from '@/branch/components/BranchChoicePanel.vue';
import BranchSegmentPlayer from '@/branch/components/BranchSegmentPlayer.vue';
import PageBackBar from '@/components/PageBackBar.vue';
import { getBranchPointDetail, chooseBranchPoint, getBranchPointStats } from '@/api/branchPoint';
import { getVideoDetail, syncVideoDuration } from '@/api/video';
import { recordInteraction, getInteractionStats } from '@/api/interaction';
import { getWatchProgress, saveWatchProgress } from '@/api/watchProgress';
import { useSessionStore } from '@/stores/session';
import { smartBack } from '@/utils/navigation';
import { getLocalProgress, setLocalProgress, formatProgressLabel, clampProgressSeconds } from '@/utils/watchProgress';
import { getPlayPreferences, savePlayPreferences } from '@/utils/playPreferences';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const loading = ref(true);
const loadError = ref('');
const video = ref(null);
const highlights = ref([]);
const branchPoints = ref([]);
const playerRef = ref(null);
const branchPanelVisible = ref(false);
const branchSegmentVisible = ref(false);
const currentBranchPoint = ref(null);
const branchChoices = ref([]);
const branchStats = ref(null);
const branchChoosing = ref(false);
const branchPlayback = ref({ asset: null });
const resumeAfterBranch = ref(0);
const panelVisible = ref(false);
const currentHighlight = ref(null);
const interactionStats = ref(null);
const hasSelected = ref(false);
const panelMode = ref('options');
const startTime = ref(0);
const resumeHint = ref('');
const prefs = ref(getPlayPreferences());
let lastSaveAt = 0;
let sessionBaselinePosition = 0;
const PROGRESS_ADVANCE_SECONDS = 3;
const MIN_SAVE_SECONDS = 5;

const videoUrl = computed(() => video.value?.video_url || '');
const videoId = computed(() => Number(route.params.id));
const backLabel = computed(() => (video.value?.series_id ? '返回选集' : '返回列表'));
const effectiveHighlights = computed(() => (prefs.value.highlightEnabled ? highlights.value : []));
const effectiveBranchPoints = computed(() => (prefs.value.branchEnabled ? branchPoints.value : []));

onMounted(loadVideo);

async function loadVideo() {
  loading.value = true;
  loadError.value = '';
  video.value = null;
  try {
    const data = await getVideoDetail(route.params.id);
    video.value = data.video;
    highlights.value = data.highlights || [];
    branchPoints.value = data.branch_points || [];

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
    loadError.value = e.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

onBeforeUnmount(() => {
  flushProgress(playerRef.value?.getCurrentTime() || 0);
});

function savePrefs() {
  savePlayPreferences(prefs.value);
  if (!prefs.value.highlightEnabled && panelVisible.value) closePanel();
  if (!prefs.value.branchEnabled && branchPanelVisible.value) closeBranchPanel();
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

function onHighlightReached(highlight) {
  if (branchPanelVisible.value || branchSegmentVisible.value) return;
  playerRef.value?.confirmHighlight(highlight.id);
  currentHighlight.value = highlight;
  panelVisible.value = true;
  hasSelected.value = false;
  panelMode.value = 'options';
  loadStats(highlight.id);
}

function closePanel() {
  panelVisible.value = false;
  if (currentHighlight.value?.id) {
    playerRef.value?.clearHighlightTrigger?.(currentHighlight.value.id);
  }
}

function onOverlayDismiss() {
  if (panelVisible.value) closePanel();
  else if (branchPanelVisible.value) closeBranchPanel();
}

async function onBranchReached(point) {
  if (branchSegmentVisible.value || branchPanelVisible.value) return;
  if (panelVisible.value) closePanel();
  playerRef.value?.confirmBranch(point.id);
  resumeAfterBranch.value = playerRef.value?.getCurrentTime?.() || point.timestamp;
  currentBranchPoint.value = point;
  branchPanelVisible.value = true;
  branchChoosing.value = false;
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
    ElMessage.success(`已选择「${result.choice.option_label}」`);
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
  const t = resumeAfterBranch.value;
  if (playerRef.value?.jumpTo) {
    playerRef.value.jumpTo(t);
  }
  playerRef.value?.play?.();
}

function seekBranchPoint(b) {
  playerRef.value?.jumpToBranch?.(b.timestamp, b.id);
}

async function onSelectOption(option) {
  if (!currentHighlight.value || hasSelected.value) return;
  try {
    await recordInteraction({
      highlight_id: currentHighlight.value.id,
      user_session_id: session.userSessionId,
      selected_option: option,
    });
    hasSelected.value = true;
    panelMode.value = 'result';
    playerRef.value?.playEffect(currentHighlight.value.category);
    await loadStats(currentHighlight.value.id);
    ElMessage.success(`你选择了「${option}」`);
    setTimeout(closePanel, 3000);
  } catch { /* handled by interceptor */ }
}

async function loadStats(highlightId) {
  interactionStats.value = await getInteractionStats(highlightId);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const labels = { conflict: '冲突', reversal: '反转', sweet: '撒糖', scene: '名场面' };
function categoryLabel(c) { return labels[c] || c; }
</script>

<style scoped>
.play-page { max-width: 900px; margin: 0 auto; }
.play-header { margin-bottom: 16px; }
.play-header h2 { font-size: 20px; }
.play-empty { text-align: center; color: #999; padding: 40px 0; }
.play-empty p { margin-top: 12px; }
.ep-subtitle { color: #666; font-size: 14px; margin-top: 4px; }
.resume-hint { color: #e94560; font-size: 13px; margin-top: 8px; }
.play-prefs {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.pref-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  user-select: none;
}
.pref-item input { accent-color: #e94560; }
.highlight-list { margin-top: 24px; background: #fff; border-radius: 12px; padding: 20px; }
.highlight-list h3 { margin-bottom: 12px; font-size: 16px; }
.hl-items { display: flex; flex-direction: column; gap: 8px; }
.hl-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 14px;
  border-radius: 8px; cursor: pointer; transition: background 0.2s;
}
.hl-item:hover { background: #f5f5f5; }
.hl-time { font-weight: 600; color: #e94560; min-width: 50px; }
.hl-title { flex: 1; }
.hl-tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; color: #fff; }
.hl-item.conflict .hl-tag { background: #ff4757; }
.hl-item.reversal .hl-tag { background: #ffa502; }
.hl-item.sweet .hl-tag { background: #ff6b81; }
.hl-item.scene .hl-tag { background: #5352ed; }
.branch-list { margin-top: 16px; }
.branch-item { border-left: 3px solid #5352ed; }
.branch-tag { background: #5352ed !important; }
</style>
