<template>
  <div>
    <h1 class="page-title">短剧列表</h1>
    <div v-if="loading" v-loading="true" style="height:200px" />
    <div v-else-if="videos.length === 0" class="empty">暂无短剧，请先在管理后台上传</div>
    <div v-else class="video-grid">
      <div
        v-for="v in videos"
        :key="v.id"
        class="video-card"
        @click="$router.push(`/play/${v.id}`)"
      >
        <div class="cover">🎬</div>
        <div class="info">
          <div class="title">{{ v.title }}</div>
          <div class="meta">{{ formatDuration(v.total_duration) }} · {{ v.highlight_count }} 个高光点</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getVideoList } from '@/api/video';

const videos = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const data = await getVideoList();
    videos.value = data.list || [];
  } finally {
    loading.value = false;
  }
});

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${s}秒`;
}
</script>

<style scoped>
.empty { text-align: center; color: #999; padding: 60px; }
</style>
