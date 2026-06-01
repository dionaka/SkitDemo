<template>
  <div class="branch-admin">
    <div class="page-head">
      <h1>分支 Demo 管理</h1>
      <p>编辑节点资源 · 上传视频/图片/音频 · 支持 static / tts / video_synth</p>
    </div>

    <div v-if="loading" v-loading="true" style="height:300px" />

    <template v-else>
      <div class="demo-tabs">
        <button
          v-for="item in demos"
          :key="item.id"
          type="button"
          class="tab-btn"
          :class="{ active: selectedId === item.id }"
          @click="loadTree(item.id)"
        >
          {{ item.title }}
        </button>
        <el-button v-if="selectedId" size="small" @click="handlePrewarm">预热资源</el-button>
      </div>

      <div v-if="tree" class="tree-panel">
        <div class="panel-block">
          <h3>{{ tree.demo.title }}</h3>
          <p class="muted">{{ tree.demo.description }}</p>
          <div class="gen-tags">
            <span v-for="g in generators" :key="g" class="gen-tag">{{ g }}</span>
          </div>
        </div>

        <div v-for="node in tree.nodes" :key="node.id" class="panel-block node-edit">
          <div class="node-head">
            <span class="node-id">#{{ node.id }}</span>
            <strong>{{ node.label }}</strong>
            <span class="node-type">{{ node.node_type }}</span>
          </div>

          <el-form label-width="100px" size="small" class="node-form">
            <el-form-item label="生成器">
              <el-select v-model="forms[node.id].generator" style="width:180px">
                <el-option v-for="g in generators" :key="g" :label="g" :value="g" />
              </el-select>
            </el-form-item>

            <template v-if="forms[node.id].generator === 'video_synth'">
              <el-form-item label="源视频">
                <el-input v-model="forms[node.id].source_video_url" placeholder="/uploads/videos/xxx.mp4" />
              </el-form-item>
              <el-form-item label="切片区间">
                <el-input-number v-model="forms[node.id].start_at" :min="0" /> —
                <el-input-number v-model="forms[node.id].end_at" :min="1" /> 秒
              </el-form-item>
            </template>

            <template v-if="forms[node.id].generator === 'tts'">
              <el-form-item label="旁白文案">
                <el-input v-model="forms[node.id].text" type="textarea" :rows="2" />
              </el-form-item>
              <el-form-item label="TTS 提供方">
                <el-select v-model="forms[node.id].provider" style="width:180px">
                  <el-option v-for="p in ttsProviders" :key="p" :label="p" :value="p" />
                </el-select>
              </el-form-item>
            </template>

            <el-form-item label="画面文案">
              <el-input v-model="forms[node.id].caption" />
            </el-form-item>

            <el-form-item v-if="node.branch_at != null" label="分叉点">
              <el-input-number v-model="forms[node.id].branch_at" :min="1" /> 秒
            </el-form-item>

            <el-form-item label="上传资源">
              <div class="upload-row">
                <label class="upload-btn">
                  视频<input type="file" accept="video/*" hidden @change="onFile(node.id, 'video', $event)" />
                </label>
                <label class="upload-btn">
                  图片<input type="file" accept="image/*" hidden @change="onFile(node.id, 'image', $event)" />
                </label>
                <label class="upload-btn">
                  音频<input type="file" accept="audio/*" hidden @change="onFile(node.id, 'audio', $event)" />
                </label>
              </div>
            </el-form-item>

            <div class="asset-preview">
              <div>类型 {{ node.asset.type }} · 已解析 {{ node.asset.generator }}</div>
              <div v-if="node.asset.video_url">视频 {{ node.asset.video_url }}</div>
              <div v-if="node.asset.audio_url">音频 {{ node.asset.audio_url }}</div>
              <div v-if="node.asset.tts_provider">TTS {{ node.asset.tts_provider }}</div>
            </div>

            <el-button type="primary" size="small" :loading="savingId === node.id" @click="saveNode(node)">
              保存节点
            </el-button>
          </el-form>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getAdminBranchDemos,
  getAdminBranchTree,
  getBranchGenerators,
  getTtsProviders,
  updateBranchNode,
  uploadBranchNodeAssets,
  prewarmBranchDemo,
} from '@/branch/api';

const loading = ref(true);
const demos = ref([]);
const selectedId = ref(null);
const tree = ref(null);
const generators = ref([]);
const ttsProviders = ref([]);
const forms = reactive({});
const savingId = ref(null);

onMounted(async () => {
  try {
    const [demoRes, genRes, ttsRes] = await Promise.all([
      getAdminBranchDemos(),
      getBranchGenerators(),
      getTtsProviders(),
    ]);
    demos.value = demoRes.list || [];
    generators.value = genRes.generators || [];
    ttsProviders.value = ttsRes.providers || [];
    if (demos.value.length) await loadTree(demos.value[0].id);
  } finally {
    loading.value = false;
  }
});

function buildForm(node) {
  const spec = node.asset_spec || {};
  forms[node.id] = {
    generator: spec.generator || 'static',
    source_video_url: spec.source_video_url || '',
    start_at: spec.start_at ?? 0,
    end_at: spec.end_at ?? 12,
    text: spec.text || spec.caption || '',
    provider: spec.provider || 'windows_sapi',
    caption: spec.caption || '',
    branch_at: node.branch_at,
    type: spec.type || node.asset?.type || 'composite',
  };
}

async function loadTree(id) {
  selectedId.value = id;
  tree.value = await getAdminBranchTree(id);
  tree.value.nodes.forEach(buildForm);
}

function buildAssetSpec(form) {
  const base = { generator: form.generator, caption: form.caption, type: form.type };
  if (form.generator === 'video_synth') {
    return {
      ...base,
      type: 'video',
      source_video_url: form.source_video_url,
      start_at: form.start_at,
      end_at: form.end_at,
      fallback_image_url: '/uploads/branches/demo/intro.svg',
    };
  }
  if (form.generator === 'tts') {
    return {
      ...base,
      type: 'composite',
      text: form.text,
      provider: form.provider,
      voice: 'default',
    };
  }
  return base;
}

async function saveNode(node) {
  const form = forms[node.id];
  savingId.value = node.id;
  try {
    await updateBranchNode(node.id, {
      branch_at: form.branch_at,
      asset_spec: buildAssetSpec(form),
    });
    ElMessage.success('已保存');
    await loadTree(selectedId.value);
  } finally {
    savingId.value = null;
  }
}

async function onFile(nodeId, kind, event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const fd = new FormData();
  if (kind === 'video') fd.append('video_file', file);
  if (kind === 'image') fd.append('image_file', file);
  if (kind === 'audio') fd.append('audio_file', file);
  savingId.value = nodeId;
  try {
    await uploadBranchNodeAssets(nodeId, fd);
    ElMessage.success('上传成功');
    await loadTree(selectedId.value);
  } finally {
    savingId.value = null;
    event.target.value = '';
  }
}

async function handlePrewarm() {
  await prewarmBranchDemo(selectedId.value);
  ElMessage.success('资源预热完成');
  await loadTree(selectedId.value);
}
</script>

<style scoped>
.branch-admin { max-width: 960px; }
.page-head { margin-bottom: 24px; }
.page-head h1 { font-size: 22px; margin-bottom: 6px; }
.page-head p { color: #666; font-size: 14px; }
.demo-tabs { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 20px; }
.tab-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}
.tab-btn.active { border-color: #5352ed; color: #5352ed; background: #eef0ff; }
.panel-block {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}
.muted { color: #888; font-size: 13px; margin: 8px 0; }
.node-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.node-id { font-size: 12px; color: #999; }
.node-type { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #f0f0f0; }
.gen-tags { display: flex; gap: 8px; flex-wrap: wrap; }
.gen-tag {
  padding: 4px 12px;
  background: #eef0ff;
  color: #5352ed;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}
.upload-row { display: flex; gap: 8px; flex-wrap: wrap; }
.upload-btn {
  padding: 6px 12px;
  border: 1px dashed #ccc;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}
.asset-preview {
  font-size: 12px;
  color: #666;
  margin: 8px 0 12px;
  line-height: 1.6;
  word-break: break-all;
}
</style>
