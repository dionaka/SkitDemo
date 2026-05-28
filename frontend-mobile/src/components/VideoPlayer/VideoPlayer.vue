<template>
  <div class="video-player">
    <div class="player-wrapper">
      <video
        ref="videoRef"
        :src="src"
        playsinline
        webkit-playsinline
        x5-playsinline
        preload="metadata"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoaded"
        @click="togglePlay"
        @play="playing = true"
        @pause="playing = false"
      />
      <EffectOverlay :type="effectType" :active="showEffect" />
    </div>

    <div class="controls">
      <button class="ctrl-btn" @click="togglePlay">{{ playing ? '⏸' : '▶' }}</button>

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
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import HighlightMarker from './HighlightMarker.vue';
import EffectOverlay from '../effects/EffectOverlay.vue';

const props = defineProps({
  src: String,
  highlights: { type: Array, default: () => [] },
});

const emit = defineEmits(['highlight-reached', 'timeupdate']);

const videoRef = ref(null);
const progressRef = ref(null);
const playing = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const progressPercent = ref(0);
const triggeredIds = ref(new Set());
const effectType = ref('');
const showEffect = ref(false);

function togglePlay() {
  if (!videoRef.value) return;
  if (videoRef.value.paused) {
    videoRef.value.play().catch(() => {});
  } else {
    videoRef.value.pause();
  }
}

function onLoaded() {
  duration.value = videoRef.value?.duration || 0;
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

defineExpose({ playEffect, jumpTo, resetTriggers });
</script>

<style scoped>
.video-player {
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}

.player-wrapper {
  position: relative;
  background: #000;
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
  gap: 10px;
  padding: 12px 14px;
  background: #111;
  color: #fff;
}

.ctrl-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-area {
  flex: 1;
  cursor: pointer;
  padding: 12px 0;
  touch-action: none;
}

.progress-bar {
  position: relative;
  height: 8px;
  background: #444;
  border-radius: 4px;
}

.progress-fill {
  height: 100%;
  background: #e94560;
  border-radius: 4px;
  transition: width 0.1s;
}

.time {
  font-size: 11px;
  white-space: nowrap;
  color: #aaa;
}
</style>
