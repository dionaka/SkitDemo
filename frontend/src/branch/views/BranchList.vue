<template>
  <div>
    <h1 class="page-title">剧情分支体验</h1>
    <p class="page-desc">
      预生成内容 Demo · 与高光互动模块独立 · 后续可接入 TTS / 视频合成生成器
    </p>

    <div v-if="loading" v-loading="true" style="height:200px" />
    <div v-else-if="demos.length === 0" class="empty">暂无分支 Demo</div>

    <div v-else class="demo-grid">
      <div
        v-for="item in demos"
        :key="item.id"
        class="demo-card"
        @click="$router.push(`/branch/${item.id}`)"
      >
        <div class="demo-icon">🔀</div>
        <div class="demo-body">
          <div class="demo-title">{{ item.title }}</div>
          <div class="demo-meta">
            {{ item.node_count }} 个节点
            <span v-if="item.series_title"> · {{ item.series_title }}</span>
          </div>
          <p class="demo-brief">{{ item.description }}</p>
        </div>
        <div class="demo-go">体验 →</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getBranchDemos } from '@/branch/api';

const loading = ref(true);
const demos = ref([]);

onMounted(async () => {
  try {
    const data = await getBranchDemos();
    demos.value = data.list || [];
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page-desc { color: #666; font-size: 14px; margin: -8px 0 24px; }
.empty { text-align: center; color: #999; padding: 60px; }
.demo-grid { display: flex; flex-direction: column; gap: 14px; }
.demo-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 14px;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.15s, box-shadow 0.15s;
  border-left: 4px solid #5352ed;
}
.demo-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(83, 82, 237, 0.15);
}
.demo-icon { font-size: 32px; line-height: 1; }
.demo-body { flex: 1; min-width: 0; }
.demo-title { font-size: 17px; font-weight: 700; margin-bottom: 6px; }
.demo-meta { font-size: 12px; color: #999; margin-bottom: 8px; }
.demo-brief {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.demo-go { color: #5352ed; font-weight: 600; font-size: 14px; white-space: nowrap; }
</style>
