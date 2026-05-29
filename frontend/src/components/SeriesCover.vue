<template>
  <div class="series-cover" :class="[variant, { 'has-image': showImage }]">
    <img
      v-if="showImage"
      class="cover-img"
      :src="currentSrc"
      :alt="title || '剧集封面'"
      loading="lazy"
      @error="onImageError"
    />
    <div
      v-else
      class="cover-fallback"
      :style="{ background: coverGradient(title) }"
    >
      <span class="cover-initial">{{ coverInitial(title) }}</span>
    </div>
    <div class="cover-overlay" />
    <slot />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import {
  coverGradient,
  coverInitial,
  getBundledDefaultCover,
  resolveCoverSrc,
} from '@/utils/cover';

const props = defineProps({
  coverUrl: { type: String, default: '' },
  title: { type: String, default: '' },
  variant: { type: String, default: 'poster' },
});

const currentSrc = ref(resolveCoverSrc(props.coverUrl));
const showImage = ref(true);

watch(
  () => [props.coverUrl, props.title],
  () => {
    currentSrc.value = resolveCoverSrc(props.coverUrl);
    showImage.value = true;
  },
);

function onImageError() {
  const bundled = getBundledDefaultCover();
  if (currentSrc.value !== bundled) {
    currentSrc.value = bundled;
    return;
  }
  showImage.value = false;
}
</script>

<style scoped>
.series-cover {
  position: relative;
  overflow: hidden;
  background: #1a1a28;
}

.series-cover.poster {
  width: 100%;
  aspect-ratio: 3 / 4;
}

.series-cover.card {
  width: 100%;
  height: 180px;
}

.series-cover.thumb {
  width: 56px;
  height: 74px;
  border-radius: 10px;
  flex-shrink: 0;
}

.series-cover.banner {
  width: 100%;
  height: 200px;
  border-radius: 12px;
}

.cover-img,
.cover-fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-initial {
  font-size: 28px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.35) 0%, transparent 55%);
  pointer-events: none;
}

:slotted(*) {
  position: relative;
  z-index: 2;
}
</style>
