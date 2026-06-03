<template>
  <SettingsSection title="离线缓存" description="在此管理下载；断网时首页会显示已缓存分集">
    <div class="card cache-card">
      <div class="stats-row">
        <div class="stat">
          <span class="stat-value">{{ stats.count }}</span>
          <span class="stat-label">已缓存</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ stats.totalLabel }}</span>
          <span class="stat-label">占用空间</span>
        </div>
      </div>

      <p v-if="!supported" class="hint warn">当前浏览器不支持 IndexedDB，无法使用离线缓存。</p>
      <p v-else class="hint">在选集页或播放页下载分集。退出 App 后可在下方「继续下载」。</p>

      <div v-if="completedItems.length === 0 && pausedItems.length === 0 && downloadingItems.length === 0" class="empty">
        暂无缓存，去选集页下载想看的分集吧。
      </div>

      <ul v-else class="cache-list">
        <li v-for="item in downloadingItems" :key="`dl-${item.videoId}`" class="cache-item downloading">
          <div class="item-main">
            <div class="item-title">{{ item.seriesTitle || '短剧' }} · 第 {{ item.episodeNumber }} 集</div>
            <div class="item-sub">{{ item.title || '下载中…' }}</div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${item.progress || 0}%` }" />
            </div>
          </div>
          <span class="item-meta">{{ item.progress || 0 }}%</span>
        </li>

        <li v-for="item in pausedItems" :key="`paused-${item.videoId}`" class="cache-item paused">
          <div class="item-main">
            <div class="item-title">{{ item.seriesTitle || '短剧' }} · 第 {{ item.episodeNumber }} 集</div>
            <div class="item-sub">{{ item.title || '下载未完成' }}</div>
            <div class="progress-track">
              <div class="progress-fill paused" :style="{ width: `${item.progress || 0}%` }" />
            </div>
            <p v-if="item.error" class="item-error">{{ item.error }}</p>
          </div>
          <div class="item-actions">
            <button type="button" class="play-btn" @click="resumeItem(item)">继续下载</button>
            <span class="item-meta">{{ item.progress || 0 }}%</span>
            <button type="button" class="delete-btn" @click="removeItem(item.videoId)">删除</button>
          </div>
        </li>

        <li v-for="item in completedItems" :key="item.videoId" class="cache-item">
          <button type="button" class="item-main item-link" @click="openItem(item)">
            <div class="item-title">{{ item.seriesTitle || '短剧' }} · 第 {{ item.episodeNumber }} 集</div>
            <div class="item-sub">{{ item.title || '已缓存' }}</div>
          </button>
          <div class="item-actions">
            <button type="button" class="play-btn" @click="openItem(item)">播放</button>
            <span class="item-meta">{{ formatSize(item.fileSize) }}</span>
            <button type="button" class="delete-btn" @click.stop="removeItem(item.videoId)">删除</button>
          </div>
        </li>
      </ul>

      <button
        v-if="stats.count > 0 || pausedItems.length > 0"
        type="button"
        class="btn btn-ghost clear-btn"
        @click="clearAll"
      >
        清空全部缓存
      </button>
    </div>
  </SettingsSection>
</template>

<script setup>
import { computed, onActivated, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import SettingsSection from './SettingsSection.vue';
import { useOfflineCacheStore } from '@/stores/offlineCache';
import { formatCacheSize } from '@/services/offlineCache';

const router = useRouter();
const cacheStore = useOfflineCacheStore();
const { items, stats, supported } = storeToRefs(cacheStore);

const completedItems = computed(() => items.value.filter((i) => i.status === 'completed'));
const pausedItems = computed(() => items.value.filter((i) => i.status === 'paused' || i.status === 'failed'));
const downloadingItems = computed(() => items.value.filter((i) => i.status === 'downloading'));

function formatSize(bytes) {
  return formatCacheSize(bytes);
}

function refresh() {
  cacheStore.hydrate();
}

onMounted(refresh);
onActivated(refresh);

function openItem(item) {
  router.push(`/play/${item.videoId}`);
}

async function resumeItem(item) {
  try {
    await cacheStore.download({
      videoId: item.videoId,
      seriesId: item.seriesId,
      seriesTitle: item.seriesTitle,
      episodeNumber: item.episodeNumber,
      title: item.title,
      coverUrl: item.coverUrl,
      videoUrl: item.remoteUrl,
    });
  } catch (err) {
    alert(err.message || '继续下载失败，请检查网络');
  }
}

async function removeItem(videoId) {
  if (!confirm('确定删除这条离线缓存吗？')) return;
  await cacheStore.remove(videoId);
}

async function clearAll() {
  if (!confirm('确定清空全部离线缓存吗？')) return;
  await cacheStore.clearAll();
}
</script>

<style scoped>
.cache-card {
  padding: 16px 18px;
}

.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.stat {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
}

.stat-label {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.hint {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 14px;
}

.hint.warn {
  color: #ffb347;
}

.empty {
  padding: 18px 0 8px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}

.cache-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cache-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
}

.cache-item:first-child {
  border-top: none;
  padding-top: 0;
}

.item-main {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.item-link {
  border: none;
  background: transparent;
  color: inherit;
  padding: 0;
  cursor: pointer;
}

.item-title {
  font-size: 14px;
  font-weight: 600;
}

.item-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-error {
  margin: 6px 0 0;
  font-size: 11px;
  color: #ffb347;
}

.progress-track {
  margin-top: 8px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-gradient, var(--accent));
  transition: width 0.2s ease;
}

.progress-fill.paused {
  background: rgba(255, 179, 71, 0.85);
}

.item-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.play-btn {
  border: none;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--accent-gradient, var(--accent));
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.item-meta {
  font-size: 11px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.delete-btn {
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
}

.clear-btn {
  width: 100%;
  margin-top: 14px;
}
</style>
