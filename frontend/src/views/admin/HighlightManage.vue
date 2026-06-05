<template>
  <div>
    <div class="page-header">
      <el-button text @click="$router.push('/admin/videos')">← 返回视频列表</el-button>
      <h1 class="page-title">高光点管理 (视频 #{{ videoId }})</h1>
    </div>

    <div class="toolbar">
      <el-button type="primary" @click="showAdd = true">+ 手动添加高光点</el-button>
      <el-button type="success" :loading="analyzingDanmaku" @click="handleAnalyzeDanmaku">
        从弹幕生成高光
      </el-button>
    </div>

    <el-table :data="highlights" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="timestamp" label="时间(秒)" width="100" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="category" label="类型" width="100" />
      <el-table-column label="来源" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="sourceTagType(row.source)">{{ sourceLabel(row.source) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="激发特效" width="120">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ effectLabel(row.effect_key || row.category) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="互动选项">
        <template #default="{ row }">
          <el-tag v-for="o in row.options" :key="o" size="small" style="margin-right:4px">{{ o }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button size="small" @click="editHighlight(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showAdd" :title="editingId ? '编辑高光点' : '添加高光点'" width="500">
      <el-form label-width="100px">
        <el-form-item label="时间(秒)">
          <el-input-number v-model="form.timestamp" :min="0" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.category">
            <el-option label="冲突 conflict" value="conflict" />
            <el-option label="反转 reversal" value="reversal" />
            <el-option label="撒糖 sweet" value="sweet" />
            <el-option label="名场面 scene" value="scene" />
          </el-select>
        </el-form-item>
        <el-form-item label="激发特效">
          <el-select v-model="form.effect_key" clearable placeholder="默认跟随类型">
            <el-option v-for="opt in EFFECT_KEY_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="选项1"><el-input v-model="form.opt1" /></el-form-item>
        <el-form-item label="选项2"><el-input v-model="form.opt2" /></el-form-item>
        <el-form-item label="选项3"><el-input v-model="form.opt3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAdd = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getHighlights,
  createHighlight,
  updateHighlight,
  deleteHighlight,
  analyzeDanmakuHighlights,
  getDanmakuDensity,
} from '@/api/admin';
import { EFFECT_KEY_OPTIONS, EFFECT_REGISTRY } from '@/utils/effectRegistry';

const route = useRoute();
const videoId = route.params.videoId;
const highlights = ref([]);
const showAdd = ref(false);
const editingId = ref(null);
const analyzingDanmaku = ref(false);
const form = ref({ timestamp: 0, title: '', category: 'reversal', effect_key: '', opt1: '', opt2: '', opt3: '' });

function effectLabel(key) {
  return EFFECT_REGISTRY[key]?.label || key || '—';
}

const SOURCE_LABELS = { ai_video: 'AI视频', danmaku: '弹幕', manual: '手动' };

function sourceLabel(source) {
  return SOURCE_LABELS[source] || source || '未知';
}

function sourceTagType(source) {
  if (source === 'manual') return 'warning';
  if (source === 'danmaku') return 'success';
  return 'info';
}

onMounted(loadHighlights);

async function loadHighlights() {
  const data = await getHighlights(videoId);
  highlights.value = data.list || [];
}

function editHighlight(row) {
  editingId.value = row.id;
  form.value = {
    timestamp: row.timestamp,
    title: row.title,
    category: row.category,
    effect_key: row.effect_key && row.effect_key !== row.category ? row.effect_key : '',
    opt1: row.options[0] || '',
    opt2: row.options[1] || '',
    opt3: row.options[2] || '',
  };
  showAdd.value = true;
}

async function handleSave() {
  const options = [form.value.opt1, form.value.opt2, form.value.opt3].filter(Boolean);
  if (options.length < 2) {
    ElMessage.warning('至少需要2个互动选项');
    return;
  }

  const payload = {
    video_id: Number(videoId),
    timestamp: form.value.timestamp,
    title: form.value.title,
    category: form.value.category,
    interaction_type: form.value.category,
    effect_key: form.value.effect_key || form.value.category,
    options,
  };

  if (editingId.value) {
    await updateHighlight(editingId.value, payload);
    ElMessage.success('更新成功');
  } else {
    await createHighlight(payload);
    ElMessage.success('添加成功');
  }

  showAdd.value = false;
  editingId.value = null;
  form.value = { timestamp: 0, title: '', category: 'reversal', effect_key: '', opt1: '', opt2: '', opt3: '' };
  await loadHighlights();
}

async function handleDelete(id) {
  await ElMessageBox.confirm('确定删除此高光点？', '提示');
  await deleteHighlight(id);
  ElMessage.success('删除成功');
  await loadHighlights();
}

async function handleAnalyzeDanmaku() {
  try {
    const preview = await getDanmakuDensity(videoId);
    const clusters = preview.clusters || [];
    const hint = clusters.length
      ? `检测到 ${clusters.length} 个弹幕密集区（每 5 秒 ≥${preview.min_danmaku_count} 条且 ≥${preview.min_unique_users} 人）。\n\n将用 AI 分析并生成/合并高光，±5 秒内重复会自动合并，手动高光不会被覆盖。`
      : `当前暂无满足条件的弹幕热点（需每 5 秒 ≥${preview.min_danmaku_count} 条且 ≥${preview.min_unique_users} 人）。仍要尝试分析吗？`;
    await ElMessageBox.confirm(hint, '从弹幕生成高光', {
      confirmButtonText: clusters.length ? '开始分析' : '仍要分析',
      cancelButtonText: '取消',
      type: clusters.length ? 'info' : 'warning',
    });
  } catch (e) {
    if (e === 'cancel') return;
    ElMessage.error(e.message || '预览失败');
    return;
  }

  analyzingDanmaku.value = true;
  try {
    const result = await analyzeDanmakuHighlights(videoId);
    const msg = result.message
      || `完成：新增 ${result.created || 0}，合并 ${result.merged || 0}，跳过 ${result.skipped || 0}`;
    ElMessage.success(msg);
    await loadHighlights();
  } catch (e) {
    ElMessage.error(e.message || '分析失败');
  } finally {
    analyzingDanmaku.value = false;
  }
}
</script>

<style scoped>
.page-header { margin-bottom: 16px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
</style>
