<template>
  <div class="engagement-bar">
    <button
      type="button"
      class="engagement-btn"
      :class="{ active: liked }"
      :disabled="busy"
      @click="onLike"
    >
      <span class="icon">{{ liked ? '❤️' : '🤍' }}</span>
      <span class="label">点赞</span>
      <span class="count">{{ likeCount }}</span>
    </button>
    <button
      type="button"
      class="engagement-btn"
      :class="{ active: favorited }"
      :disabled="busy"
      @click="onFavorite"
    >
      <span class="icon">{{ favorited ? '★' : '☆' }}</span>
      <span class="label">收藏</span>
      <span class="count">{{ favoriteCount }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  getSeriesEngagement,
  toggleSeriesLike,
  toggleSeriesFavorite,
} from '@/api/engagement';
import { useSessionStore } from '@/stores/session';

const props = defineProps({
  seriesId: { type: [Number, String], required: true },
});

const emit = defineEmits(['toast']);

const router = useRouter();
const session = useSessionStore();

const liked = ref(false);
const favorited = ref(false);
const likeCount = ref(0);
const favoriteCount = ref(0);
const busy = ref(false);

watch(() => props.seriesId, loadEngagement, { immediate: true });

onMounted(loadEngagement);

async function loadEngagement() {
  if (!props.seriesId) return;
  try {
    const data = await getSeriesEngagement(props.seriesId, session.userSessionId);
    liked.value = Boolean(data.liked);
    favorited.value = Boolean(data.favorited);
    likeCount.value = data.like_count || 0;
    favoriteCount.value = data.favorite_count || 0;
  } catch {
    /* ignore */
  }
}

function requireLogin() {
  emit('toast', '请先登录');
  router.push('/login');
  return false;
}

async function onLike() {
  if (!session.isLoggedIn) {
    requireLogin();
    return;
  }
  busy.value = true;
  try {
    const data = await toggleSeriesLike(props.seriesId, session.userSessionId);
    liked.value = Boolean(data.liked);
    likeCount.value = data.like_count || 0;
    favoriteCount.value = data.favorite_count || 0;
    favorited.value = Boolean(data.favorited);
    emit('toast', liked.value ? '已点赞' : '已取消点赞');
  } catch (e) {
    emit('toast', e.message || '操作失败');
  } finally {
    busy.value = false;
  }
}

async function onFavorite() {
  if (!session.isLoggedIn) {
    requireLogin();
    return;
  }
  busy.value = true;
  try {
    const data = await toggleSeriesFavorite(props.seriesId, session.userSessionId);
    favorited.value = Boolean(data.favorited);
    favoriteCount.value = data.favorite_count || 0;
    likeCount.value = data.like_count || 0;
    liked.value = Boolean(data.liked);
    emit('toast', favorited.value ? '已收藏' : '已取消收藏');
  } catch (e) {
    emit('toast', e.message || '操作失败');
  } finally {
    busy.value = false;
  }
}

defineExpose({ reload: loadEngagement });
</script>

<style scoped>
.engagement-bar {
  display: flex;
  gap: 10px;
}

.engagement-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--border-light);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
}

.engagement-btn:active:not(:disabled) {
  background: var(--bg-card-hover);
}

.engagement-btn.active {
  border-color: rgba(255, 77, 109, 0.35);
  background: var(--accent-soft);
  color: var(--accent);
}

.engagement-btn:disabled {
  opacity: 0.6;
}

.icon {
  font-size: 16px;
  line-height: 1;
}

.count {
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
  font-size: 12px;
}

.engagement-btn.active .count {
  color: var(--accent);
}
</style>
