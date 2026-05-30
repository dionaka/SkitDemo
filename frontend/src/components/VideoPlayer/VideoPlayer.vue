<template>
  <div ref="playerRootRef" class="video-player" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="player-wrapper">
      <video
        ref="videoRef"
        :src="src"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoaded"
        @pause="onPause"
        @click="togglePlay"
      />
      <EffectOverlay :type="effectType" :active="showEffect" />
    </div>

    <div class="controls">
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
  startTime: { type: Number, default: 0 },
});

const emit = defineEmits(['highlight-reached', 'timeupdate', 'pause']);

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
const effectType = ref('');
const showEffect = ref(false);
const hasAppliedStart = ref(false);

watch(volume, (v) => { if (videoRef.value) videoRef.value.volume = v; });

function togglePlay() {
  if (!videoRef.value) return;
  if (videoRef.value.paused) { videoRef.value.play(); playing.value = true; }
  else { videoRef.value.pause(); playing.value = false; }
}

function onLoaded() {
  duration.value = videoRef.value?.duration || 0;
  applyStartTime();
  if (videoRef.value) videoRef.value.playbackRate = playbackRate.value;
}

function applyStartTime() {
  if (hasAppliedStart.value || !videoRef.value || props.startTime <= 0) return;
  videoRef.value.currentTime = props.startTime;
  currentTime.value = props.startTime;
  progressPercent.value = duration.value ? (props.startTime / duration.value) * 100 : 0;
  hasAppliedStart.value = true;
}

function onPause() {
  emit('pause', videoRef.value?.currentTime || 0);
}

function onTimeUpdate() {
  if (!videoRef.value) return;
  currentTime.value = videoRef.value.currentTime;
  progressPercent.value = duration.value ? (currentTime.value / duration.value) * 100 : 0;
  emit('timeupdate', currentTime.value);

  props.highlights.forEach((h) => {
    if (!triggeredIds.value.has(h.id) && Math.abs(currentTime.value - h.timestamp) < 0.8) {
      triggeredIds.value.add(h.id);
      emit('highlight-reached', h);
    }
  });
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
    triggeredIds.value.delete(
      props.highlights.find((h) => h.timestamp === time)?.id
    );
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

defineExpose({ playEffect, jumpTo, resetTriggers, getCurrentTime });
</script>

<style scoped>
.video-player { background: #000; border-radius: 12px; overflow: hidden; }
.video-player.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  border-radius: 0;
  display: flex;
  flex-direction: column;
}
.video-player.is-fullscreen .player-wrapper { flex: 1; display: flex; align-items: center; }
.video-player.is-fullscreen video { max-height: none; height: 100%; width: 100%; }
.player-wrapper { position: relative; }
video { width: 100%; max-height: 480px; display: block; cursor: pointer; }
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
.time { font-size: 12px; white-space: nowrap; }
.volume { width: 60px; accent-color: #e94560; }
</style>
