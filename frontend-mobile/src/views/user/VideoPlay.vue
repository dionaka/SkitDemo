<template>

  <div class="play-page" :class="{ immersive: true }">

    <div v-if="loading" class="loading-box">加载中...</div>



    <template v-else-if="video">

      <PageBackBar :label="backLabel" @back="goBack" />

      <div class="play-header">

        <h2>{{ video.series_title }} · 第 {{ video.episode_number }} 集</h2>

        <p class="ep-subtitle">{{ video.title }}</p>

        <p v-if="resumeHint" class="resume-hint">{{ resumeHint }}</p>

      </div>



      <VideoPlayer

        ref="playerRef"

        :src="videoUrl"

        :highlights="highlights"

        :start-time="startTime"

        @highlight-reached="onHighlightReached"

        @timeupdate="onTimeUpdate"

        @pause="onPause"

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



    <div v-else-if="!loading" class="play-empty">

      <PageBackBar label="返回" @back="goBack" />

      <p>{{ loadError || '视频不存在或未发布' }}</p>

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

import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

import { useRoute, useRouter } from 'vue-router';

import VideoPlayer from '@/components/VideoPlayer/VideoPlayer.vue';

import InteractionPanel from '@/components/InteractionPanel/InteractionPanel.vue';

import PageBackBar from '@/components/PageBackBar.vue';

import { resolveMediaUrl } from '@/config/server';

import { getVideoDetail } from '@/api/video';

import { recordInteraction, getInteractionStats } from '@/api/interaction';

import { getWatchProgress, saveWatchProgress } from '@/api/watchProgress';

import { useSessionStore } from '@/stores/session';

import { smartBack } from '@/utils/navigation';

import { getLocalProgress, setLocalProgress, formatProgressLabel } from '@/utils/watchProgress';



const route = useRoute();

const router = useRouter();

const session = useSessionStore();



const loading = ref(true);

const loadError = ref('');

const video = ref(null);

const highlights = ref([]);

const playerRef = ref(null);

const panelVisible = ref(false);

const currentHighlight = ref(null);

const interactionStats = ref(null);

const hasSelected = ref(false);

const toast = ref('');

const startTime = ref(0);

const resumeHint = ref('');

let lastSaveAt = 0;



const videoUrl = computed(() => resolveMediaUrl(video.value?.video_url || ''));

const videoId = computed(() => Number(route.params.id));

const backLabel = computed(() => (video.value?.series_id ? '返回选集' : '返回列表'));



onMounted(loadVideo);



async function loadVideo() {

  loading.value = true;

  loadError.value = '';

  video.value = null;

  try {

    const data = await getVideoDetail(route.params.id);

    video.value = data.video;

    highlights.value = data.highlights || [];



    const local = getLocalProgress(videoId.value);

    let remote = 0;

    try {

      const progress = await getWatchProgress(videoId.value, session.userSessionId);

      remote = progress.position_seconds || 0;

    } catch { /* ignore */ }



    const resume = Math.max(local, remote);

    if (resume >= 5) {

      startTime.value = resume;

      resumeHint.value = `将从 ${formatProgressLabel(resume, video.value.total_duration)} 继续播放`;

    }

  } catch (e) {

    loadError.value = e.message || '加载失败';

  } finally {

    loading.value = false;

  }

}



onBeforeUnmount(() => {

  flushProgress(playerRef.value?.getCurrentTime() || 0);

});



async function goBack() {
  const t = playerRef.value?.getCurrentTime?.();
  if (t) await flushProgress(t);
  const fallback = video.value?.series_id ? `/series/${video.value.series_id}` : '/';
  smartBack(router, fallback);
}



async function flushProgress(seconds) {

  if (!videoId.value || seconds < 1) return;

  lastSaveAt = Date.now();

  setLocalProgress(videoId.value, seconds);

  try {

    await saveWatchProgress(videoId.value, {

      user_session_id: session.userSessionId,

      position_seconds: seconds,

    });

  } catch { /* silent */ }

}



function persistProgress(seconds, force = false) {

  if (!videoId.value || seconds < 1) return;

  const now = Date.now();

  if (!force && now - lastSaveAt < 5000) return;

  lastSaveAt = now;

  setLocalProgress(videoId.value, seconds);

  saveWatchProgress(videoId.value, {

    user_session_id: session.userSessionId,

    position_seconds: seconds,

  }).catch(() => {});

}



function onTimeUpdate(seconds) {

  persistProgress(seconds);

}



function onPause(seconds) {

  persistProgress(seconds, true);

}



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

.play-page.immersive {

  margin: -16px;

  padding: 16px;

  padding-top: calc(8px + env(safe-area-inset-top));

  min-height: calc(100vh - 52px);

}



.play-header { margin-bottom: 12px; }

.play-header h2 { font-size: 17px; line-height: 1.4; }

.ep-subtitle { color: #888; font-size: 13px; margin-top: 4px; }

.resume-hint { color: #e94560; font-size: 12px; margin-top: 6px; }

.play-empty { text-align: center; color: #888; padding: 40px 0; }

.play-empty p { margin-top: 12px; }

.highlight-list { margin-top: 16px; }

.highlight-list h3 { margin-bottom: 10px; font-size: 15px; }

.hl-items { display: flex; flex-direction: column; gap: 8px; }

.hl-item {

  display: flex; align-items: center; gap: 10px; padding: 10px 12px;

  border-radius: 8px; background: #0f0f1a; cursor: pointer;

}

.hl-item:active { background: #252540; }

.hl-time { font-weight: 600; color: #e94560; min-width: 44px; font-size: 13px; }

.hl-title { flex: 1; font-size: 14px; }

.hl-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; color: #fff; white-space: nowrap; }

.hl-item.conflict .hl-tag { background: #ff4757; }

.hl-item.reversal .hl-tag { background: #ffa502; }

.hl-item.sweet .hl-tag { background: #ff6b81; }

.hl-item.scene .hl-tag { background: #5352ed; }

</style>

