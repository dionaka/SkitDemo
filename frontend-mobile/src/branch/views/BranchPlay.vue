<template>
  <div class="branch-play immersive">
    <div v-if="loading" class="loading-box">加载中...</div>

    <template v-else-if="demo && currentNode">
      <PageBackBar v-show="!panelVisible" label="返回" @back="goBack" />

      <div v-show="!panelVisible" class="play-header">
        <span class="demo-tag">预生成分支</span>
        <h2>{{ demo.title }}</h2>
      </div>

      <BranchSegmentPlayer
        ref="segmentRef"
        :asset="currentNode.asset"
        :branch-at="panelVisible ? null : currentNode.branch_at"
        @branch-point="openChoicePanel"
        @segment-ended="onSegmentEnded"
      />

      <div v-if="currentNode.is_ending && !panelVisible" class="ending-bar">
        <button type="button" class="btn btn-primary" @click="restartDemo">重新体验</button>
      </div>
    </template>

    <div v-else class="empty-state">
      <PageBackBar label="返回" @back="goBack" />
      <p>{{ loadError || '分支 Demo 不存在' }}</p>
    </div>

    <BranchChoicePanel
      :visible="panelVisible"
      :title="choiceTitle"
      :subtitle="choiceSubtitle"
      :choices="currentNode?.choices || []"
      :stats="branchStats"
      :loading="choosing"
      @select="onChoose"
      @dismiss="panelVisible = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageBackBar from '@/components/PageBackBar.vue';
import BranchSegmentPlayer from '@/branch/components/BranchSegmentPlayer.vue';
import BranchChoicePanel from '@/branch/components/BranchChoicePanel.vue';
import { getBranchDemo, chooseBranch, getBranchStats } from '@/branch/api';
import { useSessionStore } from '@/stores/session';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const loading = ref(true);
const loadError = ref('');
const demo = ref(null);
const currentNode = ref(null);
const entryNode = ref(null);
const panelVisible = ref(false);
const choosing = ref(false);
const branchStats = ref(null);
const segmentRef = ref(null);

const choiceTitle = computed(() => {
  if (currentNode.value?.choices?.length === 1 && currentNode.value.choices[0].option_label === '继续') {
    return '继续观看';
  }
  return '剧情分叉 · 你的选择';
});

const choiceSubtitle = computed(() => currentNode.value?.asset?.caption || '');

onMounted(loadDemo);

async function loadDemo() {
  loading.value = true;
  try {
    const data = await getBranchDemo(route.params.id);
    demo.value = data.demo;
    entryNode.value = data.node;
    currentNode.value = data.node;
    await refreshStats();
  } catch (e) {
    loadError.value = e.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

async function refreshStats() {
  try {
    branchStats.value = await getBranchStats(route.params.id);
  } catch {
    branchStats.value = null;
  }
}

function openChoicePanel() {
  if (!currentNode.value?.choices?.length) return;
  segmentRef.value?.pause();
  panelVisible.value = true;
  refreshStats();
}

function onSegmentEnded() {
  if (currentNode.value?.choices?.length && !currentNode.value.is_ending) {
    openChoicePanel();
  }
}

async function onChoose(choice) {
  choosing.value = true;
  try {
    const result = await chooseBranch(route.params.id, {
      from_node_id: currentNode.value.id,
      choice_id: choice.id,
      user_session_id: session.userSessionId,
    });
    panelVisible.value = false;
    currentNode.value = result.node;
    await refreshStats();
  } finally {
    choosing.value = false;
  }
}

function restartDemo() {
  currentNode.value = entryNode.value;
  panelVisible.value = false;
  segmentRef.value?.restart();
}

function goBack() {
  router.push('/branch');
}
</script>

<style scoped>
.branch-play.immersive { min-height: 100vh; background: #000; color: #fff; padding-bottom: var(--safe-bottom); }
.play-header { padding: 0 16px 12px; }
.demo-tag {
  display: inline-block;
  font-size: 11px;
  color: #5352ed;
  background: rgba(83, 82, 237, 0.2);
  padding: 3px 10px;
  border-radius: 20px;
  margin-bottom: 8px;
}
.play-header h2 { font-size: 18px; }
.ending-bar { padding: 16px; text-align: center; }
.loading-box { padding: 80px; text-align: center; color: #888; }
.empty-state { padding: 40px 16px; text-align: center; color: #888; }
</style>
