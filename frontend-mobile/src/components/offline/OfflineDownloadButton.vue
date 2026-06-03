<template>
  <button
    type="button"
    class="offline-btn"
    :class="[state, { compact }]"
    :disabled="disabled || state === 'downloading'"
    :aria-label="ariaLabel"
    @click.stop="onTap"
  >
    <span v-if="state === 'downloading'" class="offline-progress">{{ progress }}%</span>
    <span v-else-if="state === 'paused'" class="offline-progress">{{ progress }}%</span>
    <svg v-else-if="state === 'cached'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 6 9 17l-5-5" />
    </svg>
    <svg v-else-if="state === 'failed' || state === 'paused'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
    </svg>
    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
    </svg>
  </button>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useOfflineCacheStore } from '@/stores/offlineCache';

const props = defineProps({
  videoId: { type: [Number, String], required: true },
  seriesId: { type: [Number, String], default: null },
  seriesTitle: { type: String, default: '' },
  episodeNumber: { type: [Number, String], default: null },
  title: { type: String, default: '' },
  coverUrl: { type: String, default: '' },
  videoUrl: { type: String, required: true },
  compact: { type: Boolean, default: false },
});

const emit = defineEmits(['toast']);

const cacheStore = useOfflineCacheStore();
const { items, activeDownloadId } = storeToRefs(cacheStore);

const item = computed(() => items.value.find((i) => i.videoId === Number(props.videoId)));

const state = computed(() => {
  const current = item.value;
  if (activeDownloadId.value === Number(props.videoId) || current?.status === 'downloading') {
    return 'downloading';
  }
  if (current?.status === 'completed') return 'cached';
  if (current?.status === 'paused') return 'paused';
  if (current?.status === 'failed') return 'failed';
  return 'idle';
});

const progress = computed(() => item.value?.progress || 0);

const disabled = computed(() => !cacheStore.supported);

const ariaLabel = computed(() => {
  if (state.value === 'cached') return '已缓存';
  if (state.value === 'downloading') return `下载中 ${progress.value}%`;
  if (state.value === 'paused') return `已暂停 ${progress.value}%，点击继续`;
  if (state.value === 'failed') return '下载失败，点击重试';
  return '下载到本地';
});

onMounted(() => {
  if (!cacheStore.hydrated) cacheStore.hydrate();
});

async function onTap() {
  if (disabled.value) {
    emit('toast', '当前环境不支持离线缓存');
    return;
  }
  if (state.value === 'cached') {
    emit('toast', '该集已缓存');
    return;
  }

  try {
    const wasPaused = state.value === 'paused' || state.value === 'failed';
    await cacheStore.download({
      videoId: props.videoId,
      seriesId: props.seriesId,
      seriesTitle: props.seriesTitle,
      episodeNumber: props.episodeNumber,
      title: props.title,
      coverUrl: props.coverUrl,
      videoUrl: props.videoUrl,
    });
    emit('toast', wasPaused ? '已继续并完成下载' : '下载完成，可离线观看');
  } catch (err) {
    const current = item.value;
    if (current?.status === 'paused') {
      emit('toast', '下载已暂停，可稍后继续');
    } else {
      emit('toast', err.message || '下载失败');
    }
  }
}
</script>

<style scoped>
.offline-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.offline-btn.compact {
  width: 32px;
  height: 32px;
  border-radius: 10px;
}

.offline-btn svg {
  width: 18px;
  height: 18px;
}

.offline-btn.cached {
  color: #7dffb2;
  border-color: rgba(125, 255, 178, 0.35);
}

.offline-btn.downloading,
.offline-btn.paused {
  color: var(--accent);
  border-color: rgba(255, 77, 109, 0.35);
}

.offline-btn.failed {
  color: #ffb347;
  border-color: rgba(255, 179, 71, 0.35);
}

.offline-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.offline-progress {
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
