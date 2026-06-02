<template>
  <div ref="playerRootRef" class="video-player" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="player-wrapper">
      <video
        v-show="!segmentVisible"
        ref="videoRef"
        :src="src"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoaded"
        @pause="onPause"
        @play="onPlay"
        @click="togglePlay"
      />
      <EffectOverlay v-show="!segmentVisible" :type="effectType" :active="showEffect" />
      <div v-if="segmentVisible" class="player-segment-layer">
        <slot name="segment" />
      </div>
      <div v-if="overlayVisible && !segmentVisible" class="player-overlay-mask" @click="$emit('overlay-dismiss')">
        <div class="player-overlay" @click.stop>
          <slot name="overlay" />
        </div>
      </div>
    </div>

    <div v-show="!segmentVisible" class="controls">
      <button type="button" class="ctrl-btn" aria-label="播放/暂停" @click="togglePlay">
        {{ playing ? '⏸' : '▶' }}
      </button>

      <div class="progress-area" ref="progressRef" @click="seek">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }" />
          <HighlightMarker
            v-for="h in highlights"
            :key="h.id"
            :highlight="h"
            :duration="duration"
            @click="jumpTo(h.timestamp)"
          />
          <div
            v-for="b in branchPoints"
            :key="'bp-' + b.id"
            class="branch-marker"
            :style="{ left: (duration ? (b.timestamp / duration) * 100 : 0) + '%' }"
            :title="b.title"
            @click.stop="jumpToBranch(b.timestamp, b.id)"
          />
        </div>
      </div>

      <span class="time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>

      <div class="speed-wrap">
        <button type="button" class="ctrl-btn speed-btn" @click="speedMenuOpen = !speedMenuOpen">
          {{ playbackRate }}x
        </button>
        <div v-if="speedMenuOpen" class="speed-menu">
          <button
            v-for="rate in speedOptions"
            :key="rate"
            type="button"
            class="speed-option"
            :class="{ active: playbackRate === rate }"
            @click="setPlaybackRate(rate)"
          >
            {{ rate }}x
          </button>
        </div>
      </div>

      <input type="range" min="0" max="1" step="0.05" v-model.number="volume" class="volume" />

      <button type="button" class="ctrl-btn" aria-label="全屏" @click="toggleFullscreen">
        {{ isFullscreen ? '⤡' : '⛶' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import HighlightMarker from './HighlightMarker.vue';
import EffectOverlay from '../effects/EffectOverlay.vue';

const props = defineProps({
  src: String,
  highlights: { type: Array, default: () => [] },
  branchPoints: { type: Array, default: () => [] },
  startTime: { type: Number, default: 0 },
  overlayVisible: { type: Boolean, default: false },
  segmentVisible: { type: Boolean, default: false },
});

const emit = defineEmits(['highlight-reached', 'branch-reached', 'timeupdate', 'pause', 'overlay-dismiss', 'duration']);

const speedOptions = [0.75, 1, 1.25, 1.5, 2];

const videoRef = ref(null);
const playerRootRef = ref(null);
const progressRef = ref(null);
const playing = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const progressPercent = ref(0);
const playbackRate = ref(1);
const speedMenuOpen = ref(false);
const isFullscreen = ref(false);
const cssFullscreen = ref(false);
const triggeredIds = ref(new Set());
const branchTriggeredIds = ref(new Set());
const effectType = ref('');
const showEffect = ref(false);
const hasAppliedStart = ref(false);
const playbackStarted = ref(false);
const pendingHighlightIds = ref(new Set());
const pendingBranchIds = ref(new Set());

const TRIGGER_WINDOW = 0.8;
const CONFLICT_GAP = 3;

watch(volume, (v) => { if (videoRef.value) videoRef.value.volume = v; });

function isInTriggerWindow(time, timestamp) {
  return Math.abs(time - timestamp) < TRIGGER_WINDOW;
}

function findTriggerCandidate(items, triggeredSet, time) {
  return items.find((item) => !triggeredSet.value.has(item.id) && isInTriggerWindow(time, item.timestamp));
}

function cleanStalePending(time) {
  [...pendingHighlightIds.value].forEach((id) => {
    const h = props.highlights.find((item) => item.id === id);
    if (!h || !isInTriggerWindow(time, h.timestamp)) pendingHighlightIds.value.delete(id);
  });
  [...pendingBranchIds.value].forEach((id) => {
    const b = props.branchPoints.find((item) => item.id === id);
    if (!b || !isInTriggerWindow(time, b.timestamp)) pendingBranchIds.value.delete(id);
  });
}

function tryEmitHighlight(highlight) {
  if (!highlight) {
    cleanStalePending(currentTime.value);
    return;
  }
  if (!isInTriggerWindow(currentTime.value, highlight.timestamp)) {
    pendingHighlightIds.value.delete(highlight.id);
    return;
  }
  if (!pendingHighlightIds.value.has(highlight.id)) {
    pendingHighlightIds.value.add(highlight.id);
    emit('highlight-reached', highlight);
  }
}

function tryEmitBranch(branch) {
  if (!branch) {
    cleanStalePending(currentTime.value);
    return;
  }
  if (!isInTriggerWindow(currentTime.value, branch.timestamp)) {
    pendingBranchIds.value.delete(branch.id);
    return;
  }
  if (!pendingBranchIds.value.has(branch.id)) {
    pendingBranchIds.value.add(branch.id);
    emit('branch-reached', branch);
  }
}

function togglePlay() {
  if (!videoRef.value) return;
  if (videoRef.value.paused) { videoRef.value.play(); }
  else { videoRef.value.pause(); playing.value = false; }
}

function onPlay() {
  playing.value = true;
  playbackStarted.value = true;
}

function onLoaded() {
  duration.value = videoRef.value?.duration || 0;
  applyStartTime();
  if (videoRef.value) videoRef.value.playbackRate = playbackRate.value;
  if (duration.value > 0) emit('duration', duration.value);
}

function applyStartTime() {
  if (hasAppliedStart.value || !videoRef.value || props.startTime <= 0) return;
  videoRef.value.currentTime = props.startTime;
  currentTime.value = props.startTime;
  progressPercent.value = duration.value ? (props.startTime / duration.value) * 100 : 0;
  hasAppliedStart.value = true;
}

watch(() => props.src, () => {
  playbackStarted.value = false;
  hasAppliedStart.value = false;
  currentTime.value = 0;
  duration.value = 0;
  progressPercent.value = 0;
});

function onPause() {
  emit('pause', videoRef.value?.currentTime || 0);
}

function onTimeUpdate() {
  if (!videoRef.value || !playbackStarted.value) return;
  currentTime.value = videoRef.value.currentTime;
  progressPercent.value = duration.value ? (currentTime.value / duration.value) * 100 : 0;
  emit('timeupdate', currentTime.value);

  const t = currentTime.value;
  cleanStalePending(t);
  const branch = findTriggerCandidate(props.branchPoints, branchTriggeredIds, t);
  const highlight = findTriggerCandidate(props.highlights, triggeredIds, t);
  const conflict = branch && highlight
    && Math.abs(branch.timestamp - highlight.timestamp) < CONFLICT_GAP;

  if (conflict) {
    tryEmitBranch(branch);
    if (highlight) pendingHighlightIds.value.delete(highlight.id);
    return;
  }

  tryEmitHighlight(highlight);
  tryEmitBranch(branch);
}

function seek(e) {
  if (!progressRef.value || !videoRef.value) return;
  const rect = progressRef.value.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  videoRef.value.currentTime = ratio * duration.value;
}

function jumpTo(time) {
  if (videoRef.value) {
    videoRef.value.currentTime = time;
    const h = props.highlights.find((item) => item.timestamp === time);
    if (h) triggeredIds.value.delete(h.id);
  }
}

function jumpToBranch(time, id) {
  if (videoRef.value) {
    videoRef.value.currentTime = time;
    if (id) branchTriggeredIds.value.delete(id);
  }
}

function setPlaybackRate(rate) {
  playbackRate.value = rate;
  if (videoRef.value) videoRef.value.playbackRate = rate;
  speedMenuOpen.value = false;
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function syncFullscreenState() {
  isFullscreen.value = Boolean(getFullscreenElement()) || cssFullscreen.value;
}

async function toggleFullscreen() {
  speedMenuOpen.value = false;
  const root = playerRootRef.value;
  const video = videoRef.value;
  if (!root) return;

  if (getFullscreenElement() || cssFullscreen.value) {
    await exitFullscreen();
    return;
  }

  try {
    if (root.requestFullscreen) {
      await root.requestFullscreen();
    } else if (root.webkitRequestFullscreen) {
      await root.webkitRequestFullscreen();
    } else if (video?.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    } else {
      cssFullscreen.value = true;
      document.body.style.overflow = 'hidden';
    }
    syncFullscreenState();
  } catch {
    cssFullscreen.value = true;
    document.body.style.overflow = 'hidden';
    syncFullscreenState();
  }
}

async function exitFullscreen() {
  cssFullscreen.value = false;
  document.body.style.overflow = '';
  if (getFullscreenElement()) {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
  syncFullscreenState();
}

function onDocumentClick(e) {
  if (!e.target.closest('.speed-wrap')) speedMenuOpen.value = false;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function playEffect(type) {
  effectType.value = type;
  showEffect.value = false;
  requestAnimationFrame(() => { showEffect.value = true; });
  setTimeout(() => { showEffect.value = false; }, 2500);
}

function resetTriggers() {
  triggeredIds.value.clear();
  branchTriggeredIds.value.clear();
  pendingHighlightIds.value.clear();
  pendingBranchIds.value.clear();
}

function confirmHighlight(id) {
  triggeredIds.value.add(id);
  pendingHighlightIds.value.delete(id);
}

function confirmBranch(id) {
  branchTriggeredIds.value.add(id);
  pendingBranchIds.value.delete(id);
}

function clearBranchTrigger(id) {
  branchTriggeredIds.value.delete(id);
  pendingBranchIds.value.delete(id);
}

function clearHighlightTrigger(id) {
  triggeredIds.value.delete(id);
  pendingHighlightIds.value.delete(id);
}

function getCurrentTime() {
  return videoRef.value?.currentTime || 0;
}

onMounted(() => {
  document.addEventListener('fullscreenchange', syncFullscreenState);
  document.addEventListener('webkitfullscreenchange', syncFullscreenState);
  document.addEventListener('click', onDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', syncFullscreenState);
  document.removeEventListener('webkitfullscreenchange', syncFullscreenState);
  document.removeEventListener('click', onDocumentClick);
  if (cssFullscreen.value) document.body.style.overflow = '';
});

function pause() {
  if (videoRef.value && !videoRef.value.paused) {
    videoRef.value.pause();
    playing.value = false;
  }
}

function play() {
  if (videoRef.value?.paused) {
    videoRef.value.play();
    playing.value = true;
  }
}

defineExpose({
  playEffect,
  jumpTo,
  jumpToBranch,
  resetTriggers,
  confirmHighlight,
  confirmBranch,
  clearBranchTrigger,
  clearHighlightTrigger,
  getCurrentTime,
  pause,
  play,
  togglePlay,
});
</script>

<style scoped>
.video-player { background: #000; border-radius: 12px; overflow: hidden; }
.video-player.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  border-radius: 0;
  width: 100vw;
  max-width: 100vw;
  height: 100vh;
  max-height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.video-player.is-fullscreen .player-wrapper { flex: 1; min-height: 0; display: flex; align-items: center; position: relative; }
.video-player.is-fullscreen video { max-height: 100%; height: 100%; width: 100%; object-fit: contain; }
.player-wrapper { position: relative; width: 100%; }
.player-segment-layer {
  position: relative;
  width: 100%;
  background: #000;
}
.player-segment-layer :deep(.branch-segment) {
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: min(480px, 80vh);
}
.player-segment-layer :deep(.segment-video),
.player-segment-layer :deep(.composite-image) {
  object-fit: contain;
}
.video-player.is-fullscreen .player-segment-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.video-player.is-fullscreen .player-segment-layer :deep(.branch-segment) {
  width: 100%;
  height: 100%;
  max-height: none;
  aspect-ratio: unset;
  border-radius: 0;
}
.video-player.is-fullscreen .player-segment-layer :deep(.segment-video),
.video-player.is-fullscreen .player-segment-layer :deep(.composite-image) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.video-player.is-fullscreen .player-segment-layer :deep(.segment-composite) {
  width: 100%;
  height: 100%;
}
.player-overlay-mask {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 12px 14px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.08);
}
.player-overlay {
  max-width: min(300px, 42%);
  max-height: calc(100% - 16px);
  display: flex;
  pointer-events: auto;
}
video { width: 100%; max-height: min(480px, 80vh); display: block; cursor: pointer; object-fit: contain; }
.controls {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; background: #111; color: #fff;
  flex-shrink: 0;
}
.ctrl-btn { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
.speed-btn {
  font-size: 13px;
  font-weight: 600;
  min-width: 44px;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
}
.speed-wrap { position: relative; }
.speed-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  background: rgba(20, 20, 28, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 72px;
  z-index: 10;
}
.speed-option {
  border: none;
  background: transparent;
  color: #ddd;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
}
.speed-option.active,
.speed-option:hover {
  background: rgba(233, 69, 96, 0.25);
  color: #fff;
}
.progress-area { flex: 1; cursor: pointer; padding: 8px 0; }
.progress-bar {
  position: relative; height: 6px; background: #444; border-radius: 3px;
}
.progress-fill { height: 100%; background: #e94560; border-radius: 3px; transition: width 0.1s; }
.branch-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: #5352ed;
  border: 2px solid #fff;
  cursor: pointer;
  z-index: 3;
}
.time { font-size: 12px; white-space: nowrap; }
.volume { width: 60px; accent-color: #e94560; }
</style>
