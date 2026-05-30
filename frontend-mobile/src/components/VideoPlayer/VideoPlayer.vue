<template>
  <Teleport to="body" :disabled="!cssFullscreen">
    <div
      ref="playerRootRef"
      class="video-player"
      :class="{
        'is-fullscreen': cssFullscreen,
        'portrait-video': videoIsPortrait,
      }"
    >
      <div class="player-stage">
        <video
          ref="videoRef"
          :src="src"
          playsinline
          webkit-playsinline
          x5-playsinline
          preload="metadata"
          @timeupdate="onTimeUpdate"
          @loadedmetadata="onLoaded"
          @pause="onPause"
          @click="togglePlay"
          @play="playing = true"
        />
        <EffectOverlay :type="effectType" :active="showEffect" />
        <div v-if="props.overlayVisible" class="player-overlay-mask" @click="$emit('overlay-dismiss')">
          <div class="player-overlay" @click.stop>
            <slot name="overlay" />
          </div>
        </div>
      </div>

      <div class="controls" :class="{ 'controls--overlay': cssFullscreen }">
        <button type="button" class="ctrl-btn" aria-label="播放/暂停" @click="togglePlay">
          {{ playing ? '⏸' : '▶' }}
        </button>

        <div class="progress-area" ref="progressRef" @click="seek" @touchstart.prevent="seekTouch">
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
          <button type="button" class="ctrl-btn speed-btn" @click.stop="speedMenuOpen = !speedMenuOpen">
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

        <button type="button" class="ctrl-btn fs-btn" aria-label="全屏" @click="toggleFullscreen">
          {{ isFullscreen ? '⤡' : '⛶' }}
        </button>
      </div>
    </div>
  </Teleport>

  <!-- 占位：全屏 Teleport 后保持页面布局 -->
  <div v-if="cssFullscreen" class="player-placeholder" aria-hidden="true" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Capacitor } from '@capacitor/core';
import HighlightMarker from './HighlightMarker.vue';
import EffectOverlay from '../effects/EffectOverlay.vue';
import {
  enterNativePlayerFullscreen,
  exitNativePlayerFullscreen,
  setFullscreenBackHandler,
  setBodyFullscreenClass,
} from '@/utils/playerFullscreen';

const props = defineProps({
  src: String,
  highlights: { type: Array, default: () => [] },
  startTime: { type: Number, default: 0 },
  overlayVisible: { type: Boolean, default: false },
});

const emit = defineEmits(['highlight-reached', 'timeupdate', 'pause', 'fullscreen-change', 'overlay-dismiss']);

const speedOptions = [0.75, 1, 1.25, 1.5, 2];

const videoRef = ref(null);
const playerRootRef = ref(null);
const progressRef = ref(null);
const playing = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const progressPercent = ref(0);
const playbackRate = ref(1);
const speedMenuOpen = ref(false);
const isFullscreen = ref(false);
const cssFullscreen = ref(false);
const videoIsPortrait = ref(true);
const triggeredIds = ref(new Set());
const effectType = ref('');
const showEffect = ref(false);
const hasAppliedStart = ref(false);

function togglePlay() {
  if (!videoRef.value) return;
  if (videoRef.value.paused) {
    videoRef.value.play().catch(() => {});
  } else {
    videoRef.value.pause();
  }
}

function detectVideoOrientation() {
  const v = videoRef.value;
  if (!v?.videoWidth || !v?.videoHeight) return;
  videoIsPortrait.value = v.videoHeight >= v.videoWidth;
}

function onLoaded() {
  duration.value = videoRef.value?.duration || 0;
  detectVideoOrientation();
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
  playing.value = false;
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

function seekAtClientX(clientX) {
  if (!progressRef.value || !videoRef.value || !duration.value) return;
  const rect = progressRef.value.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  videoRef.value.currentTime = ratio * duration.value;
}

function seek(e) {
  seekAtClientX(e.clientX);
}

function seekTouch(e) {
  if (e.touches?.[0]) seekAtClientX(e.touches[0].clientX);
}

function jumpTo(time) {
  if (videoRef.value) {
    videoRef.value.currentTime = time;
    const match = props.highlights.find((h) => h.timestamp === time);
    if (match) triggeredIds.value.delete(match.id);
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

async function enterFullscreen() {
  speedMenuOpen.value = false;
  detectVideoOrientation();
  cssFullscreen.value = true;
  setBodyFullscreenClass(true);
  emit('fullscreen-change', true);
  document.body.style.overflow = 'hidden';

  if (Capacitor.isNativePlatform()) {
    await enterNativePlayerFullscreen(videoIsPortrait.value);
    setFullscreenBackHandler(() => {
      exitFullscreen();
    });
  } else {
    const root = playerRootRef.value;
    try {
      if (root?.requestFullscreen) await root.requestFullscreen();
      else if (root?.webkitRequestFullscreen) await root.webkitRequestFullscreen();
    } catch {
      // CSS fullscreen fallback
    }
  }

  syncFullscreenState();
}

async function toggleFullscreen() {
  if (getFullscreenElement() || cssFullscreen.value) {
    await exitFullscreen();
    return;
  }
  await enterFullscreen();
}

async function exitFullscreen() {
  cssFullscreen.value = false;
  setBodyFullscreenClass(false);
  emit('fullscreen-change', false);
  document.body.style.overflow = '';

  if (getFullscreenElement()) {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }

  if (Capacitor.isNativePlatform()) {
    await exitNativePlayerFullscreen();
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
  if (cssFullscreen.value) {
    document.body.style.overflow = '';
    setBodyFullscreenClass(false);
    exitNativePlayerFullscreen();
  }
});

defineExpose({ playEffect, jumpTo, resetTriggers, getCurrentTime });
</script>

<style scoped>
.video-player {
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}

.player-stage {
  position: relative;
  background: #000;
}

.player-overlay-mask {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  background: rgba(0, 0, 0, 0.08);
  padding: 10px max(10px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));
  box-sizing: border-box;
}

.player-overlay {
  width: auto;
  max-width: min(280px, 56vw);
  max-height: 100%;
  min-height: 0;
  display: flex;
  pointer-events: auto;
}

video {
  width: 100%;
  max-height: 56vh;
  display: block;
  object-fit: contain;
  background: #000;
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #111;
  color: #fff;
  flex-shrink: 0;
}

.video-player.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 10000;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #000;
}

.video-player.is-fullscreen .player-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-player.is-fullscreen video {
  width: 100%;
  height: 100%;
  max-height: none;
  object-fit: contain;
}

.video-player.is-fullscreen.portrait-video video {
  width: auto;
  height: 100%;
  max-width: 100%;
}

.controls.controls--overlay {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.55) 70%, transparent 100%);
  padding: 16px max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
}

.player-placeholder {
  width: 100%;
  aspect-ratio: 9 / 16;
  max-height: 56vh;
  border-radius: 12px;
  background: #000;
}

.ctrl-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  min-width: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.speed-btn {
  font-size: 12px;
  font-weight: 700;
  min-width: 42px;
  padding: 0 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
}

.fs-btn {
  font-size: 18px;
}

.speed-wrap {
  position: relative;
  flex-shrink: 0;
}

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
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
}

.speed-option.active {
  background: rgba(255, 77, 109, 0.28);
  color: #fff;
}

.progress-area {
  flex: 1;
  cursor: pointer;
  padding: 12px 0;
  touch-action: none;
  min-width: 0;
}

.progress-bar {
  position: relative;
  height: 8px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 4px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff4d6d, #ff8fa3);
  border-radius: 4px;
  transition: width 0.1s;
}

.time {
  font-size: 10px;
  white-space: nowrap;
  color: #ddd;
  flex-shrink: 0;
}
</style>
