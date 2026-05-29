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
  /** poster | banner | thumb */
  variant: { type: String, default: 'poster' },
});

const currentSrc = ref(resolveCoverSrc(props.coverUrl));
const showImage = ref(true);
const triedRemote = ref(false);

watch(
  () => [props.coverUrl, props.title],
  () => {
    currentSrc.value = resolveCoverSrc(props.coverUrl);
    showImage.value = true;
    triedRemote.value = false;
  },
);

function onImageError() {
  const bundled = getBundledDefaultCover();
  if (!triedRemote.value && currentSrc.value !== bundled) {
    triedRemote.value = true;
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
  box-shadow: var(--shadow-card);
}

.series-cover.poster {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-sm);
}

.series-cover.banner {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-lg);
}

.series-cover.thumb {
  width: 110px;
  height: 148px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
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
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 1;
}

.series-cover.banner .cover-initial {
  font-size: 48px;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.45) 0%, transparent 55%);
  pointer-events: none;
}
</style>
