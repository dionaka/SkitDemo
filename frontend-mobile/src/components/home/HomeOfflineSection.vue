<template>
  <section class="section offline-section">
    <div class="section-header">
      <div class="section-heading">
        <h2 class="section-title">离线缓存</h2>
        <p v-if="!isOnline" class="section-subtitle">当前无网络，以下为已下载分集</p>
        <p v-else class="section-subtitle">已下载到本机，无网也能看</p>
      </div>
      <span class="section-more">共 {{ items.length }} 集</span>
    </div>

    <div class="offline-list">
      <button
        v-for="item in items"
        :key="item.videoId"
        type="button"
        class="offline-card"
        @click="$emit('play', item)"
      >
        <SeriesCover
          class="offline-cover"
          variant="thumb"
          :cover-url="item.coverUrl"
          :title="item.seriesTitle"
        >
          <span class="offline-play">▶</span>
          <span class="offline-ep-tag">第{{ item.episodeNumber }}集</span>
        </SeriesCover>
        <div class="offline-info">
          <div class="offline-title">{{ item.seriesTitle || '短剧' }}</div>
          <div class="offline-sub">{{ item.title || `第 ${item.episodeNumber} 集` }}</div>
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
import SeriesCover from '@/components/SeriesCover.vue';

defineProps({
  items: { type: Array, default: () => [] },
  isOnline: { type: Boolean, default: true },
});

defineEmits(['play']);
</script>

<style scoped>
.offline-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.offline-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.offline-card:active {
  background: var(--bg-card-hover);
}

.offline-cover {
  width: 88px;
  flex-shrink: 0;
}

.offline-play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
}

.offline-ep-tag {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
}

.offline-info {
  flex: 1;
  min-width: 0;
}

.offline-title {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.offline-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
