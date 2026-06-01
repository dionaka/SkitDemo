<template>
  <div>
    <div class="page-header">
      <el-button text @click="$router.push('/admin/videos')">← 返回视频列表</el-button>
      <h1 class="page-title">剧情分支管理 (视频 #{{ videoId }})</h1>
    </div>

    <el-card class="options-card" shadow="never">
      <template #header>
        <span>分支资源生成选项（每次操作前选择要调用的 API）</span>
      </template>
      <el-form label-width="120px" class="options-form">
        <el-form-item label="旁白文案">
          <el-select v-model="genOptions.narration_api" style="width: 100%">
            <el-option
              v-for="item in catalog.narration_apis"
              :key="item.id"
              :label="item.label"
              :value="item.id"
              :disabled="!item.available"
            />
          </el-select>
          <div class="field-hint">{{ narrationHint }}</div>
        </el-form-item>

        <el-form-item label="人声 TTS">
          <el-select v-model="genOptions.tts_provider" style="width: 100%">
            <el-option
              v-for="item in catalog.tts_providers"
              :key="item.id"
              :label="item.label"
              :value="item.id"
              :disabled="!item.available"
            />
          </el-select>
          <div class="field-hint">{{ ttsHint }}</div>
        </el-form-item>

        <el-form-item v-if="genOptions.tts_provider === 'doubao_tts' || genOptions.tts_provider === 'siliconflow_tts'" label="音色">
          <el-select v-model="genOptions.tts_voice" style="width: 100%; margin-bottom: 8px">
            <el-option
              v-for="item in activeVoicePresets(genOptions.tts_provider)"
              :key="item.id"
              :label="item.label"
              :value="item.id"
            />
          </el-select>
          <el-input
            v-if="genOptions.tts_voice === 'custom'"
            v-model="genOptions.tts_voice_custom"
            :placeholder="genOptions.tts_provider === 'siliconflow_tts' ? '输入克隆 voice ID（speech:xinnai:…）' : '输入复刻/训练音色 voice_type'"
          />
        </el-form-item>

        <el-form-item label="画面片段">
          <el-select v-model="genOptions.visual_generator" style="width: 100%">
            <el-option
              v-for="item in catalog.visual_generators"
              :key="item.id"
              :label="item.label"
              :value="item.id"
            />
          </el-select>
          <div class="field-hint">{{ visualHint }}</div>
        </el-form-item>

        <el-form-item v-if="genOptions.visual_generator === 'tts'" label="分支配图">
          <el-select v-model="genOptions.image_api" style="width: 100%; margin-bottom: 8px">
            <el-option
              v-for="item in catalog.image_apis"
              :key="item.id"
              :label="item.label"
              :value="item.id"
              :disabled="!item.available"
            />
          </el-select>
          <div class="field-hint">{{ imageHint }}</div>
        </el-form-item>

        <el-form-item v-if="genOptions.visual_generator === 'tts' && genOptions.image_api === 'doubao_i2i'" label="短剧类型">
          <el-select v-model="genOptions.drama_genre" style="width: 100%">
            <el-option
              v-for="item in catalog.drama_genres"
              :key="item.id"
              :label="item.label"
              :value="item.id"
            />
          </el-select>
          <div class="field-hint">从主视频分支时刻截帧作参考图，再按类型风格 + 选项生成下一幕（图生图）</div>
        </el-form-item>

        <el-form-item v-if="genOptions.visual_generator === 'tts' && genOptions.image_api === 'manual'" label="手动图片 URL">
          <el-input v-model="genOptions.manual_image_url" placeholder="/uploads/..." />
        </el-form-item>
      </el-form>
      <p class="pipeline-summary">
        当前链路：<strong>{{ pipelineSummary }}</strong>
      </p>
    </el-card>

    <div class="toolbar">
      <el-button
        type="primary"
        :loading="analyzing"
        :disabled="genOptions.narration_api !== 'doubao'"
        @click="handleAnalyze"
      >
        AI 半自动识别分支点
      </el-button>
      <el-button :loading="prewarming" @click="handlePrewarm">预热 配图/TTS/切片</el-button>
      <el-button @click="showAdd = true">+ 手动添加分支点</el-button>
      <el-button text @click="$router.push('/admin/settings')">配置 API 密钥</el-button>
    </div>
    <p class="hint">
      旁白 → TTS 配音 → 主视频截帧 + 豆包图生图。识别后请点「预热」生成参考帧、插图与音频。
    </p>

    <el-empty v-if="!loading && points.length === 0" description="暂无分支点，请点击 AI 识别或手动添加" />

    <div v-for="point in points" :key="point.id" class="point-card">
      <div class="point-head">
        <span class="point-time">{{ point.timestamp }}s</span>
        <strong>{{ point.title }}</strong>
        <el-button size="small" type="danger" text @click="handleDeletePoint(point.id)">删除</el-button>
      </div>
      <el-table :data="point.choices" size="small" stripe>
        <el-table-column prop="option_label" label="选项" width="120" />
        <el-table-column prop="option_desc" label="说明" />
        <el-table-column label="生成器" width="100">
          <template #default="{ row }">{{ row.asset_spec?.generator || '-' }}</template>
        </el-table-column>
        <el-table-column label="配图" width="100">
          <template #default="{ row }">{{ row.asset_spec?.image_api || row.asset_spec?.generation_options?.image_api || '-' }}</template>
        </el-table-column>
        <el-table-column label="TTS" width="110">
          <template #default="{ row }">{{ row.asset_spec?.provider || '-' }}</template>
        </el-table-column>
        <el-table-column label="旁白/文案" min-width="200">
          <template #default="{ row }">{{ row.asset_spec?.text || row.asset_spec?.caption || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" @click="editChoice(point, row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showAdd" :title="editingPointId ? '编辑分支点' : '添加分支点'" width="560">
      <el-form label-width="100px">
        <el-form-item label="时间(秒)">
          <el-input-number v-model="pointForm.timestamp" :min="0" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="pointForm.title" />
        </el-form-item>
        <el-divider>选项 A</el-divider>
        <el-form-item label="标签"><el-input v-model="pointForm.opt1_label" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="pointForm.opt1_desc" /></el-form-item>
        <el-form-item label="旁白"><el-input v-model="pointForm.opt1_narration" type="textarea" :rows="2" /></el-form-item>
        <el-divider>选项 B</el-divider>
        <el-form-item label="标签"><el-input v-model="pointForm.opt2_label" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="pointForm.opt2_desc" /></el-form-item>
        <el-form-item label="旁白"><el-input v-model="pointForm.opt2_narration" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAdd = false">取消</el-button>
        <el-button type="primary" @click="handleSavePoint">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showChoiceEdit" title="编辑选项资源" width="520">
      <el-form v-if="choiceForm" label-width="110px">
        <el-form-item label="选项">{{ choiceForm.option_label }}</el-form-item>
        <el-form-item label="画面生成器">
          <el-select v-model="choiceForm.visual_generator">
            <el-option
              v-for="item in catalog.visual_generators"
              :key="item.id"
              :label="item.label"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="TTS 提供方">
          <el-select v-model="choiceForm.tts_provider">
            <el-option
              v-for="item in catalog.tts_providers"
              :key="item.id"
              :label="item.label"
              :value="item.id"
              :disabled="!item.available"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="choiceForm.tts_provider === 'doubao_tts' || choiceForm.tts_provider === 'siliconflow_tts'" label="音色">
          <el-select v-model="choiceForm.tts_voice" style="width: 100%; margin-bottom: 8px">
            <el-option
              v-for="item in activeVoicePresets(choiceForm.tts_provider)"
              :key="item.id"
              :label="item.label"
              :value="item.id"
            />
          </el-select>
          <el-input
            v-if="choiceForm.tts_voice === 'custom'"
            v-model="choiceForm.tts_voice_custom"
            :placeholder="choiceForm.tts_provider === 'siliconflow_tts' ? '克隆 voice ID' : '自定义 voice_type'"
          />
        </el-form-item>
        <el-form-item label="旁白文案">
          <el-input v-model="choiceForm.text" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item v-if="choiceForm.visual_generator === 'tts'" label="分支配图">
          <el-select v-model="choiceForm.image_api" style="width: 100%; margin-bottom: 8px">
            <el-option
              v-for="item in catalog.image_apis"
              :key="item.id"
              :label="item.label"
              :value="item.id"
              :disabled="!item.available"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="choiceForm.visual_generator === 'tts' && choiceForm.image_api === 'doubao_i2i'" label="短剧类型">
          <el-select v-model="choiceForm.drama_genre" style="width: 100%">
            <el-option
              v-for="item in catalog.drama_genres"
              :key="item.id"
              :label="item.label"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="choiceForm.visual_generator === 'tts' && choiceForm.image_api === 'doubao_i2i'" label="画面描述">
          <el-input v-model="choiceForm.image_prompt" type="textarea" :rows="2" placeholder="AI 识别时会自动生成；可手动微调" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showChoiceEdit = false">取消</el-button>
        <el-button type="primary" @click="handleSaveChoice">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getAdminBranchPoints,
  analyzeVideoBranches,
  createBranchPoint,
  deleteBranchPoint,
  updateBranchChoice,
  prewarmVideoBranches,
  getBranchGenerationOptions,
} from '@/api/branchPoint';

const STORAGE_KEY = 'skitdemo_branch_generation_options';

const route = useRoute();
const videoId = Number(route.params.videoId);
const loading = ref(true);
const points = ref([]);
const analyzing = ref(false);
const prewarming = ref(false);
const showAdd = ref(false);
const editingPointId = ref(null);
const pointForm = ref(emptyPointForm());
const showChoiceEdit = ref(false);
const choiceForm = ref(null);
const editingChoiceId = ref(null);
const editingChoiceSpec = ref(null);
const catalog = ref({
  narration_apis: [],
  tts_providers: [],
  image_apis: [],
  drama_genres: [],
  visual_generators: [],
  voice_presets: [],
  siliconflow_voice_presets: [],
  defaults: {},
});

const genOptions = ref(loadStoredOptions());

onMounted(async () => {
  await loadCatalog();
  await loadPoints();
});

watch(genOptions, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
}, { deep: true });

const narrationHint = computed(() =>
  catalog.value.narration_apis.find((i) => i.id === genOptions.value.narration_api)?.description || '',
);

const ttsHint = computed(() =>
  catalog.value.tts_providers.find((i) => i.id === genOptions.value.tts_provider)?.description || '',
);

const imageHint = computed(() =>
  catalog.value.image_apis?.find((i) => i.id === genOptions.value.image_api)?.description || '',
);

const visualHint = computed(() =>
  catalog.value.visual_generators.find((i) => i.id === genOptions.value.visual_generator)?.description || '',
);

const pipelineSummary = computed(() => {
  const n = catalog.value.narration_apis.find((i) => i.id === genOptions.value.narration_api)?.label || '旁白';
  const t = catalog.value.tts_providers.find((i) => i.id === genOptions.value.tts_provider)?.label || 'TTS';
  const img = catalog.value.image_apis?.find((i) => i.id === genOptions.value.image_api)?.label || '配图';
  const v = catalog.value.visual_generators.find((i) => i.id === genOptions.value.visual_generator)?.label || '画面';
  if (genOptions.value.visual_generator === 'tts') {
    return `${n} → ${t} → ${img}`;
  }
  return `${n} → ${t} → ${v}`;
});

function loadStoredOptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultOptions(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultOptions();
}

function defaultOptions() {
  return {
    narration_api: 'doubao',
    tts_provider: 'windows_sapi',
    tts_voice: 'default',
    tts_voice_custom: '',
    visual_generator: 'tts',
    image_api: 'doubao_i2i',
    drama_genre: 'auto',
    manual_image_url: '',
  };
}

function activeVoicePresets(providerId) {
  if (providerId === 'siliconflow_tts') {
    return catalog.value.siliconflow_voice_presets || [];
  }
  return catalog.value.voice_presets || [];
}

async function loadCatalog() {
  const data = await getBranchGenerationOptions();
  catalog.value = {
    narration_apis: data.narration_apis || [],
    tts_providers: data.tts_providers || [],
    image_apis: data.image_apis || [],
    drama_genres: data.drama_genres || [],
    visual_generators: data.visual_generators || [],
    voice_presets: data.voice_presets || [],
    siliconflow_voice_presets: data.siliconflow_voice_presets || [],
    defaults: data.defaults || {},
  };
  if (data.defaults) {
    genOptions.value = { ...defaultOptions(), ...data.defaults, ...loadStoredOptions() };
  }
}

function emptyPointForm() {
  return {
    timestamp: 60,
    title: '',
    opt1_label: '',
    opt1_desc: '',
    opt1_narration: '',
    opt2_label: '',
    opt2_desc: '',
    opt2_narration: '',
  };
}

function buildAssetSpecFromForm(form) {
  const opts = { ...genOptions.value };
  const voice = opts.tts_voice === 'custom' ? opts.tts_voice_custom : opts.tts_voice;
  const text = form.text;
  const genOpts = {
    narration_api: opts.narration_api,
    tts_provider: form.tts_provider || opts.tts_provider,
    tts_voice: form.tts_voice || opts.tts_voice,
    tts_voice_custom: form.tts_voice_custom || opts.tts_voice_custom,
    visual_generator: form.visual_generator || opts.visual_generator,
    image_api: form.image_api || opts.image_api,
    drama_genre: form.drama_genre || opts.drama_genre,
    manual_image_url: form.manual_image_url || opts.manual_image_url,
  };
  const base = {
    text,
    caption: text,
    provider: form.tts_provider || opts.tts_provider,
    voice: voice || 'default',
    image_api: genOpts.image_api,
    drama_genre: genOpts.drama_genre,
    image_prompt: form.image_prompt || '',
    branch_title: form.branch_title || '',
    option_label: form.option_label || '',
    option_desc: form.option_desc || '',
    generation_options: genOpts,
    duration: 6,
  };

  const visual = form.visual_generator || opts.visual_generator;
  if (visual === 'video_synth') {
    return { ...base, generator: 'video_synth', type: 'video' };
  }
  if (visual === 'static') {
    return { ...base, generator: 'static', type: 'composite' };
  }
  return { ...base, generator: 'tts', type: 'composite' };
}

async function loadPoints() {
  loading.value = true;
  try {
    const data = await getAdminBranchPoints(videoId);
    points.value = data.list || [];
  } finally {
    loading.value = false;
  }
}

async function handleAnalyze() {
  analyzing.value = true;
  try {
    const data = await analyzeVideoBranches(videoId, {
      generation_options: genOptions.value,
    });
    ElMessage.success(`已识别 ${data.branch_points?.length || 0} 个分支点`);
    await loadPoints();
  } finally {
    analyzing.value = false;
  }
}

async function handlePrewarm() {
  prewarming.value = true;
  try {
    await prewarmVideoBranches(videoId);
    ElMessage.success('资源预热完成');
  } finally {
    prewarming.value = false;
  }
}

async function handleSavePoint() {
  const f = pointForm.value;
  await createBranchPoint({
    video_id: videoId,
    timestamp: f.timestamp,
    title: f.title,
    generation_options: genOptions.value,
    choices: [
      { option_label: f.opt1_label, option_desc: f.opt1_desc, narration: f.opt1_narration },
      { option_label: f.opt2_label, option_desc: f.opt2_desc, narration: f.opt2_narration },
    ],
  });
  ElMessage.success('已保存');
  showAdd.value = false;
  pointForm.value = emptyPointForm();
  await loadPoints();
}

async function handleDeletePoint(id) {
  await ElMessageBox.confirm('确定删除该分支点？', '提示', { type: 'warning' });
  await deleteBranchPoint(id);
  ElMessage.success('已删除');
  await loadPoints();
}

function editChoice(point, choice) {
  editingChoiceId.value = choice.id;
  editingChoiceSpec.value = { ...(choice.asset_spec || {}) };
  const spec = choice.asset_spec || {};
  const gen = spec.generation_options || {};
  choiceForm.value = {
    option_label: choice.option_label,
    visual_generator: gen.visual_generator || spec.generator || 'tts',
    tts_provider: spec.provider || gen.tts_provider || 'windows_sapi',
    tts_voice: gen.tts_voice || 'default',
    tts_voice_custom: gen.tts_voice_custom || '',
    image_api: spec.image_api || gen.image_api || 'doubao_i2i',
    drama_genre: spec.drama_genre || gen.drama_genre || 'auto',
    manual_image_url: gen.manual_image_url || '',
    image_prompt: spec.image_prompt || '',
    branch_title: point.title,
    option_desc: choice.option_desc,
    text: spec.text || spec.caption || '',
  };
  showChoiceEdit.value = true;
}

async function handleSaveChoice() {
  const f = choiceForm.value;
  const spec = buildAssetSpecFromForm(f);
  const prev = editingChoiceSpec.value || {};
  if (spec.generator === 'video_synth') {
    spec.source_video_url = prev.source_video_url || spec.source_video_url;
    spec.start_at = prev.start_at ?? spec.start_at;
    spec.end_at = prev.end_at ?? spec.end_at;
  }
  if (spec.provider === 'file' && prev.audio_url) {
    spec.audio_url = prev.audio_url;
  }
  spec.series_title = prev.series_title || spec.series_title;
  spec.video_title = prev.video_title || spec.video_title;
  spec.branch_title = prev.branch_title || spec.branch_title || f.branch_title;
  spec.option_label = prev.option_label || f.option_label;
  spec.option_desc = prev.option_desc || f.option_desc;
  await updateBranchChoice(editingChoiceId.value, {
    asset_spec: spec,
  });
  ElMessage.success('已更新');
  showChoiceEdit.value = false;
  await loadPoints();
}
</script>

<style scoped>
.options-card { margin-bottom: 20px; }
.options-form { max-width: 640px; }
.field-hint { font-size: 12px; color: #999; margin-top: 4px; line-height: 1.4; }
.pipeline-summary { margin: 0; font-size: 13px; color: #555; }
.toolbar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.hint { color: #888; font-size: 13px; margin-bottom: 20px; }
.point-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border-left: 4px solid #5352ed;
}
.point-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.point-time { color: #5352ed; font-weight: 700; min-width: 48px; }
</style>
