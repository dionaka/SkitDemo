<template>
  <div class="play-page">
    <div v-if="loading" class="loading-box">加载中...</div>

    <template v-else-if="video">
      <div class="play-header">
        <button class="back-btn" @click="$router.push('/')">← 返回</button>
        <h2>{{ video.title }}</h2>
      </div>

      <VideoPlayer
        ref="playerRef"
        :src="videoUrl"
        :highlights="highlights"
        @highlight-reached="onHighlightReached"
      />

      <div class="highlight-list card">
        <h3>高光点时间轴</h3>
        <div class="hl-items">
          <div
            v-for="h in highlights"
            :key="h.id"
            class="hl-item"
            :class="h.category"
            @click="playerRef?.jumpTo(h.timestamp)"
          >
            <span class="hl-time">{{ formatTime(h.timestamp) }}</span>
            <span class="hl-title">{{ h.title }}</span>
            <span class="hl-tag">{{ categoryLabel(h.category) }}</span>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="error" class="card">
      <p class="error-text">{{ error }}</p>
      <button class="btn btn-text" @click="$router.push('/')">返回列表</button>
    </div>

    <InteractionPanel
      :visible="panelVisible"
      :highlight="currentHighlight"
      :stats="interactionStats"
      :selected="hasSelected"
      @select="onSelectOption"
    />

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import VideoPlayer from '@/components/VideoPlayer/VideoPlayer.vue';
import InteractionPanel from '@/components/InteractionPanel/InteractionPanel.vue';
import { resolveMediaUrl } from '@/config/server';
import { getVideoDetail } from '@/api/video';
import { recordInteraction, getInteractionStats } from '@/api/interaction';
import { useSessionStore } from '@/stores/session';

const route = useRoute();
const session = useSessionStore();

const loading = ref(true);
const error = ref('');
const video = ref(null);
const highlights = ref([]);
const playerRef = ref(null);
const panelVisible = ref(false);
const currentHighlight = ref(null);
const interactionStats = ref(null);
const hasSelected = ref(false);
const toast = ref('');

const videoUrl = computed(() => resolveMediaUrl(video.value?.video_url || ''));

onMounted(async () => {
  try {
    const data = await getVideoDetail(route.params.id);
    video.value = data.video;
    highlights.value = data.highlights || [];
  } catch (e) {
    error.value = e.message || '加载失败';
  } finally {
    loading.value = false;
  }
});

function showToast(msg) {
  toast.value = msg;
  setTimeout(() => { toast.value = ''; }, 2500);
}

function onHighlightReached(highlight) {
  currentHighlight.value = highlight;
  panelVisible.value = true;
  hasSelected.value = false;
  loadStats(highlight.id);
}

async function onSelectOption(option) {
  try {
    await recordInteraction({
      highlight_id: currentHighlight.value.id,
      user_session_id: session.userSessionId,
      selected_option: option,
    });
    hasSelected.value = true;
    playerRef.value?.playEffect(currentHighlight.value.category);
    await loadStats(currentHighlight.value.id);
    showToast(`你选择了「${option}」`);
    setTimeout(() => { panelVisible.value = false; }, 3000);
  } catch (e) {
    showToast(e.message || '提交失败');
  }
}

async function loadStats(highlightId) {
  interactionStats.value = await getInteractionStats(highlightId);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const labels = { conflict: '冲突', reversal: '反转', sweet: '撒糖', scene: '名场面' };
function categoryLabel(c) { return labels[c] || c; }
</script>

<style scoped>
.play-page {
  max-width: 100%;
}

.play-header {
  margin-bottom: 12px;
}

.back-btn {
  background: none;
  border: none;
  color: #e94560;
  font-size: 14px;
  padding: 4px 0;
  cursor: pointer;
}

.play-header h2 {
  margin-top: 6px;
  font-size: 18px;
  line-height: 1.4;
}

.highlight-list {
  margin-top: 16px;
}

.highlight-list h3 {
  margin-bottom: 10px;
  font-size: 15px;
}

.hl-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hl-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #0f0f1a;
  cursor: pointer;
}

.hl-item:active {
  background: #252540;
}

.hl-time {
  font-weight: 600;
  color: #e94560;
  min-width: 44px;
  font-size: 13px;
}

.hl-title {
  flex: 1;
  font-size: 14px;
}

.hl-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  color: #fff;
  white-space: nowrap;
}

.hl-item.conflict .hl-tag { background: #ff4757; }
.hl-item.reversal .hl-tag { background: #ffa502; }
.hl-item.sweet .hl-tag { background: #ff6b81; }
.hl-item.scene .hl-tag { background: #5352ed; }
</style>
