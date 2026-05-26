<template>
  <div class="play-page">
    <div v-if="loading" v-loading="true" style="height:400px" />

    <template v-else-if="video">
      <div class="play-header">
        <el-button text @click="$router.push('/')">← 返回列表</el-button>
        <h2>{{ video.title }}</h2>
      </div>

      <VideoPlayer
        ref="playerRef"
        :src="videoUrl"
        :highlights="highlights"
        @highlight-reached="onHighlightReached"
      />

      <div class="highlight-list">
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

    <InteractionPanel
      :visible="panelVisible"
      :highlight="currentHighlight"
      :stats="interactionStats"
      :selected="hasSelected"
      @select="onSelectOption"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import VideoPlayer from '@/components/VideoPlayer/VideoPlayer.vue';
import InteractionPanel from '@/components/InteractionPanel/InteractionPanel.vue';
import { getVideoDetail } from '@/api/video';
import { recordInteraction, getInteractionStats } from '@/api/interaction';
import { useSessionStore } from '@/stores/session';

const route = useRoute();
const session = useSessionStore();

const loading = ref(true);
const video = ref(null);
const highlights = ref([]);
const playerRef = ref(null);
const panelVisible = ref(false);
const currentHighlight = ref(null);
const interactionStats = ref(null);
const hasSelected = ref(false);

const videoUrl = computed(() => video.value?.video_url || '');

onMounted(async () => {
  try {
    const data = await getVideoDetail(route.params.id);
    video.value = data.video;
    highlights.value = data.highlights || [];
  } finally {
    loading.value = false;
  }
});

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
    ElMessage.success(`你选择了「${option}」`);
    setTimeout(() => { panelVisible.value = false; }, 3000);
  } catch { /* handled by interceptor */ }
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
.play-page { max-width: 900px; margin: 0 auto; }
.play-header { margin-bottom: 16px; }
.play-header h2 { margin-top: 8px; }
.highlight-list { margin-top: 24px; background: #fff; border-radius: 12px; padding: 20px; }
.highlight-list h3 { margin-bottom: 12px; font-size: 16px; }
.hl-items { display: flex; flex-direction: column; gap: 8px; }
.hl-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 14px;
  border-radius: 8px; cursor: pointer; transition: background 0.2s;
}
.hl-item:hover { background: #f5f5f5; }
.hl-time { font-weight: 600; color: #e94560; min-width: 50px; }
.hl-title { flex: 1; }
.hl-tag { font-size: 12px; padding: 2px 8px; border-radius: 10px; color: #fff; }
.hl-item.conflict .hl-tag { background: #ff4757; }
.hl-item.reversal .hl-tag { background: #ffa502; }
.hl-item.sweet .hl-tag { background: #ff6b81; }
.hl-item.scene .hl-tag { background: #5352ed; }
</style>
