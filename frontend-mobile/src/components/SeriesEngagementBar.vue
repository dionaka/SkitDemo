<template>
  <div class="engagement-bar" :class="[`variant-${variant}`]">
    <button
      type="button"
      class="engagement-btn like-btn"
      :class="{ active: liked }"
      :disabled="busy"
      aria-label="点赞"
      @click="onLike"
    >
      <span class="icon-wrap">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor">
          <path
            v-if="liked"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
          <path
            v-else
            d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"
          />
        </svg>
      </span>
      <span class="count">{{ formatCount(likeCount) }}</span>
    </button>

    <button
      type="button"
      class="engagement-btn fav-btn"
      :class="{ active: favorited }"
      :disabled="busy"
      aria-label="收藏"
      @click="onFavorite"
    >
      <span class="icon-wrap">
        <svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor">
          <path
            v-if="favorited"
            d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
          />
          <path
            v-else
            d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24zm-7.41 5.56l.94 4.03-3.53-2.09-3.53 2.09.94-4.03-2.85-2.47 4.15-.36L12 8.1l1.71 4.04 4.15.36-2.85 2.47z"
          />
        </svg>
      </span>
      <span class="count">{{ formatCount(favoriteCount) }}</span>
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
  variant: { type: String, default: 'hero' },
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

function formatCount(n) {
  const num = Number(n) || 0;
  if (num >= 10000) return `${(num / 10000).toFixed(1).replace(/\.0$/, '')}w`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(num);
}

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
  flex-shrink: 0;
}

.engagement-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.engagement-btn:disabled {
  opacity: 0.55;
}

.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.icon-svg {
  width: 20px;
  height: 20px;
}

.count {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1;
  min-width: 20px;
  text-align: center;
}

.engagement-btn:active:not(:disabled) .icon-wrap {
  transform: scale(0.92);
}

.like-btn.active .icon-wrap {
  background: rgba(255, 77, 109, 0.35);
  border-color: rgba(255, 120, 140, 0.55);
  color: #ff8fa3;
}

.like-btn.active .count {
  color: #ffb3c1;
}

.fav-btn.active .icon-wrap {
  background: rgba(255, 193, 7, 0.28);
  border-color: rgba(255, 215, 64, 0.5);
  color: #ffd54f;
}

.fav-btn.active .count {
  color: #ffe082;
}

/* Hero overlay — vertical stack on banner */
.variant-hero {
  flex-direction: column;
  gap: 14px;
}

/* Inline — compact row for play page header */
.variant-inline {
  flex-direction: row;
  gap: 16px;
  justify-content: flex-end;
}

.variant-inline .engagement-btn {
  color: var(--text-primary);
}

.variant-inline .icon-wrap {
  width: 36px;
  height: 36px;
  background: var(--bg-card);
  border-color: var(--border-light);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.variant-inline .icon-svg {
  width: 18px;
  height: 18px;
}

.variant-inline .count {
  color: var(--text-secondary);
  font-size: 10px;
}

.variant-inline .like-btn.active .icon-wrap {
  background: var(--accent-soft);
  border-color: rgba(255, 77, 109, 0.35);
  color: var(--accent);
}

.variant-inline .like-btn.active .count {
  color: var(--accent);
}

.variant-inline .fav-btn.active .icon-wrap {
  background: rgba(255, 193, 7, 0.12);
  border-color: rgba(255, 193, 7, 0.35);
  color: #e6a817;
}

.variant-inline .fav-btn.active .count {
  color: #e6a817;
}
</style>
