<template>
  <div class="branch-segment">
    <video
      v-if="asset?.type === 'video' && resolvedVideoUrl"
      ref="videoRef"
      class="segment-video"
      :src="resolvedVideoUrl"
      playsinline
      webkit-playsinline
      @timeupdate="onVideoTime"
      @loadedmetadata="onVideoLoaded"
      @ended="onSegmentEnded"
      @error="onVideoError"
    />

    <div v-else-if="asset?.type === 'composite'" class="segment-composite">
      <img v-if="resolvedImageUrl" :src="resolvedImageUrl" class="composite-image" alt="" />
      <div v-else class="composite-placeholder">预生成片段</div>
      <audio
        v-if="resolvedAudioUrl"
        ref="audioRef"
        :src="resolvedAudioUrl"
        @ended="onSegmentEnded"
        @error="onAudioError"
      />
      <div class="composite-caption">
        <p v-if="asset.caption" class="caption-main">{{ asset.caption }}</p>
        <p v-if="asset.subtitle" class="caption-sub">{{ asset.subtitle }}</p>
      </div>
    </div>

    <div v-if="loading" class="segment-loading">加载中…</div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { resolveMediaUrl } from '@/config/server';

const props = defineProps({
  asset: { type: Object, default: null },
  branchAt: { type: Number, default: null },
  autoPlay: { type: Boolean, default: true },
});

const emit = defineEmits(['branch-point', 'segment-ended', 'error']);

const videoRef = ref(null);
const audioRef = ref(null);
const loading = ref(false);
const branchTriggered = ref(false);
let compositeTimer = null;

const resolvedVideoUrl = computed(() => resolveMediaUrl(props.asset?.video_url));
const resolvedImageUrl = computed(() => resolveMediaUrl(props.asset?.image_url));
const resolvedAudioUrl = computed(() => resolveMediaUrl(props.asset?.audio_url));

watch(() => props.asset, () => {
  branchTriggered.value = false;
  clearCompositeTimer();
  startSegment();
}, { deep: true });

onMounted(startSegment);
onBeforeUnmount(clearCompositeTimer);

function clearCompositeTimer() {
  if (compositeTimer) {
    clearTimeout(compositeTimer);
    compositeTimer = null;
  }
}

async function startSegment() {
  clearCompositeTimer();
  branchTriggered.value = false;
  if (!props.asset) return;

  if (props.asset.type === 'video') {
    await playVideo();
    return;
  }

  if (props.asset.type === 'composite') {
    await playComposite();
  }
}

async function playVideo() {
  const video = videoRef.value;
  if (!video) return;
  loading.value = true;
  try {
    video.currentTime = props.asset.start_at || 0;
    if (props.autoPlay) await video.play();
  } catch {
    emit('error');
    emit('segment-ended');
  } finally {
    loading.value = false;
  }
}

async function playComposite() {
  loading.value = false;
  const audio = audioRef.value;
  if (audio && props.asset.audio_url) {
    try {
      audio.currentTime = 0;
      if (props.autoPlay) await audio.play();
    } catch {
      scheduleCompositeEnd();
    }
    return;
  }
  scheduleCompositeEnd();
}

function scheduleCompositeEnd() {
  const ms = (props.branchAt ?? props.asset.duration ?? 5) * 1000;
  compositeTimer = setTimeout(() => {
    if (props.branchAt != null && !branchTriggered.value) {
      triggerBranchPoint();
    } else {
      emit('segment-ended');
    }
  }, ms);
}

function onVideoLoaded() {
  loading.value = false;
}

function onVideoTime() {
  const video = videoRef.value;
  if (!video) return;

  const endAt = props.asset.end_at ?? props.branchAt;
  if (endAt != null && video.currentTime >= endAt - 0.05) {
    video.pause();
    if (props.branchAt != null && !branchTriggered.value) {
      triggerBranchPoint();
      return;
    }
    emit('segment-ended');
    return;
  }

  if (props.branchAt != null && video.currentTime >= props.branchAt - 0.05 && !branchTriggered.value) {
    video.pause();
    triggerBranchPoint();
  }
}

function onVideoError() {
  emit('error');
  emit('segment-ended');
}

function onAudioError() {
  scheduleCompositeEnd();
}

function triggerBranchPoint() {
  branchTriggered.value = true;
  emit('branch-point');
}

function onSegmentEnded() {
  if (props.branchAt != null && !branchTriggered.value) {
    triggerBranchPoint();
    return;
  }
  emit('segment-ended');
}

function pause() {
  videoRef.value?.pause();
  audioRef.value?.pause();
}

defineExpose({ pause, restart: startSegment });
</script>

<style scoped>
.branch-segment {
  position: relative;
  width: 100%;
  background: #000;
  overflow: hidden;
  aspect-ratio: 16 / 9;
}
.segment-video,
.composite-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #000;
}
.segment-composite {
  position: relative;
  width: 100%;
  height: 100%;
}
.composite-placeholder { color: #666; padding: 40px; text-align: center; }
.composite-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.88));
  color: #fff;
}
.caption-main { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.caption-sub { font-size: 12px; color: #ccc; }
.segment-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
}
</style>
