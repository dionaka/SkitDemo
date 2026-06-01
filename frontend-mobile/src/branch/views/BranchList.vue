<template>
  <div class="branch-list">
    <PageBackBar label="返回首页" @back="$router.push('/')" />
    <h1 class="page-title">剧情分支</h1>
    <p class="page-desc">预生成内容 Demo · 独立模块</p>

    <div v-if="loading" class="loading-box">加载中...</div>
    <div v-else-if="demos.length === 0" class="empty-state">暂无分支 Demo</div>

    <div v-else class="demo-list">
      <div
        v-for="item in demos"
        :key="item.id"
        class="demo-card card"
        @click="$router.push(`/branch/${item.id}`)"
      >
        <span class="demo-icon">🔀</span>
        <div class="demo-body">
          <div class="demo-title">{{ item.title }}</div>
          <div class="demo-meta">{{ item.node_count }} 个节点</div>
        </div>
        <span class="demo-go">▶</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import PageBackBar from '@/components/PageBackBar.vue';
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
.branch-list { padding: 0 16px 24px; }
.page-title { font-size: 22px; font-weight: 700; margin: 12px 0 4px; }
.page-desc { color: #888; font-size: 13px; margin-bottom: 20px; }
.demo-list { display: flex; flex-direction: column; gap: 12px; }
.demo-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  cursor: pointer;
  border-left: 3px solid #5352ed;
}
.demo-icon { font-size: 28px; }
.demo-body { flex: 1; }
.demo-title { font-weight: 700; margin-bottom: 4px; }
.demo-meta { font-size: 12px; color: #888; }
.demo-go { color: #5352ed; font-size: 18px; }
.loading-box, .empty-state { text-align: center; padding: 60px 0; color: #888; }
</style>
