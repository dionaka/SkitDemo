<template>
  <div class="branch-play">
    <div v-if="loading" v-loading="true" style="height:400px" />

    <template v-else-if="demo && currentNode">
      <PageBackBar label="返回分支列表" @back="goBack" />

      <div class="play-header">
        <span class="demo-tag">预生成分支</span>
        <h2>{{ demo.title }}</h2>
        <p class="demo-desc">{{ demo.description }}</p>
        <div class="path-trail">
          <span v-for="(step, i) in pathTrail" :key="i" class="path-step">{{ step }}</span>
        </div>
      </div>

      <BranchSegmentPlayer
        ref="segmentRef"
        :asset="currentNode.asset"
        :branch-at="showBranchPanel ? null : currentNode.branch_at"
        @branch-point="openChoicePanel"
        @segment-ended="onSegmentEnded"
      />

      <div class="node-meta card">
        <div class="node-label">{{ currentNode.label }}</div>
        <div class="node-gen">
          生成器 · {{ currentNode.asset?.generator || 'static' }}
          <span v-if="currentNode.asset?.tts_provider"> · TTS {{ currentNode.asset.tts_provider }}</span>
        </div>
      </div>

      <div v-if="currentNode.is_ending && !panelVisible" class="ending-actions card">
        <p>本分支体验结束</p>
        <button type="button" class="btn-restart" @click="restartDemo">重新体验</button>
      </div>
    </template>

    <div v-else class="empty">
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
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
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
const panelVisible = ref(false);
const choosing = ref(false);
const branchStats = ref(null);
const pathTrail = ref([]);
const segmentRef = ref(null);
const entryNode = ref(null);

const showBranchPanel = computed(() => panelVisible.value);

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
  loadError.value = '';
  try {
    const data = await getBranchDemo(route.params.id);
    demo.value = data.demo;
    entryNode.value = data.node;
    currentNode.value = data.node;
    pathTrail.value = [data.node.label];
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
    pathTrail.value.push(result.choice.option_label, result.node.label);
    ElMessage.success(`已选择「${result.choice.option_label}」`);
    await refreshStats();
  } finally {
    choosing.value = false;
  }
}

function restartDemo() {
  currentNode.value = entryNode.value;
  pathTrail.value = [entryNode.value.label];
  panelVisible.value = false;
  segmentRef.value?.restart();
}

function goBack() {
  router.push('/branch');
}
</script>

<style scoped>
.branch-play { max-width: 900px; margin: 0 auto; }
.play-header { margin-bottom: 16px; }
.demo-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  color: #5352ed;
  background: #eef0ff;
  padding: 3px 10px;
  border-radius: 20px;
  margin-bottom: 8px;
}
.play-header h2 { font-size: 20px; margin-bottom: 6px; }
.demo-desc { color: #666; font-size: 14px; line-height: 1.5; }
.path-trail { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.path-step {
  font-size: 12px;
  background: #fff;
  border: 1px solid #eee;
  padding: 4px 10px;
  border-radius: 20px;
  color: #555;
}
.path-step:not(:last-child)::after { content: ' →'; color: #ccc; margin-left: 4px; }
.card {
  margin-top: 16px;
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
}
.node-label { font-weight: 600; margin-bottom: 4px; }
.node-gen { font-size: 12px; color: #999; }
.ending-actions { text-align: center; }
.ending-actions p { color: #666; margin-bottom: 12px; }
.btn-restart {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  background: #e94560;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.empty { text-align: center; color: #999; padding: 40px 0; }
</style>
