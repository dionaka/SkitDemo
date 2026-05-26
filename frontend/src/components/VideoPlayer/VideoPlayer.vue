<template>
  <div class="video-player">
    <div class="player-wrapper">
      <video
        ref="videoRef"
        :src="src"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoaded"
        @click="togglePlay"
      />
      <EffectOverlay :type="effectType" :active="showEffect" />
    </div>

    <div class="controls">
      <button class="ctrl-btn" @click="togglePlay">{{ playing ? '⏸' : '▶' }}</button>

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
      <input type="range" min="0" max="1" step="0.05" v-model.number="volume" class="volume" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';
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
const volume = ref(1);
const progressPercent = ref(0);
const triggeredIds = ref(new Set());
const effectType = ref('');
const showEffect = ref(false);

watch(volume, (v) => { if (videoRef.value) videoRef.value.volume = v; });

function togglePlay() {
  if (!videoRef.value) return;
  if (videoRef.value.paused) { videoRef.value.play(); playing.value = true; }
  else { videoRef.value.pause(); playing.value = false; }
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
.video-player { background: #000; border-radius: 12px; overflow: hidden; }
.player-wrapper { position: relative; }
video { width: 100%; max-height: 480px; display: block; cursor: pointer; }
.controls {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; background: #111; color: #fff;
}
.ctrl-btn { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
.progress-area { flex: 1; cursor: pointer; padding: 8px 0; }
.progress-bar {
  position: relative; height: 6px; background: #444; border-radius: 3px;
}
.progress-fill { height: 100%; background: #e94560; border-radius: 3px; transition: width 0.1s; }
.time { font-size: 12px; white-space: nowrap; }
.volume { width: 60px; accent-color: #e94560; }
</style>
