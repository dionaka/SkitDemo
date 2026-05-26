<template>
  <div>
    <div class="page-header">
      <el-button text @click="$router.push('/admin/videos')">← 返回视频列表</el-button>
      <h1 class="page-title">高光点管理 (视频 #{{ videoId }})</h1>
    </div>

    <el-button type="primary" @click="showAdd = true" style="margin-bottom:16px">
      + 手动添加高光点
    </el-button>

    <el-table :data="highlights" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="timestamp" label="时间(秒)" width="100" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="category" label="类型" width="100" />
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
import { getHighlights, createHighlight, updateHighlight, deleteHighlight } from '@/api/admin';

const route = useRoute();
const videoId = route.params.videoId;
const highlights = ref([]);
const showAdd = ref(false);
const editingId = ref(null);
const form = ref({ timestamp: 0, title: '', category: 'reversal', opt1: '', opt2: '', opt3: '' });

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
  form.value = { timestamp: 0, title: '', category: 'reversal', opt1: '', opt2: '', opt3: '' };
  await loadHighlights();
}

async function handleDelete(id) {
  await ElMessageBox.confirm('确定删除此高光点？', '提示');
  await deleteHighlight(id);
  ElMessage.success('删除成功');
  await loadHighlights();
}
</script>

<style scoped>
.page-header { margin-bottom: 16px; }
</style>
