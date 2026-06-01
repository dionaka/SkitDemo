<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">视频管理</h1>
      <div>
        <el-button @click="$router.push('/admin/settings')">API 配置</el-button>
        <span class="admin-name">{{ session.adminUsername }}</span>
        <el-button text @click="logout">退出</el-button>
      </div>
    </div>

    <el-card class="upload-card">
      <h3>上传新视频</h3>
      <el-form :inline="true" @submit.prevent="handleUpload">
        <el-form-item label="剧名">
          <el-select
            v-model="uploadForm.series_title"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入剧名"
            style="width: 200px"
          >
            <el-option
              v-for="s in seriesList"
              :key="s.id"
              :label="s.title"
              :value="s.title"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="集数">
          <el-input-number v-model="uploadForm.episode_number" :min="1" />
        </el-form-item>
        <el-form-item label="单集标题">
          <el-input v-model="uploadForm.title" placeholder="默认取文件名" />
        </el-form-item>
        <el-form-item label="时长(秒)">
          <el-input-number v-model="uploadForm.total_duration" :min="10" />
        </el-form-item>
        <el-form-item label="视频文件">
          <input type="file" accept="video/*" @change="onVideoFileChange" />
        </el-form-item>
        <el-form-item label="自定义封面">
          <input type="file" accept="image/*" @change="onCoverFileChange" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="uploading" @click="handleUpload">上传</el-button>
        </el-form-item>
      </el-form>
      <p class="upload-hint">
        不上传封面时，系统会自动从视频第 1 秒截取一帧作为封面；第 1 集封面会同步为剧集海报。
      </p>
    </el-card>

    <el-table :data="videos" stripe style="margin-top:20px">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="封面" width="90">
        <template #default="{ row }">
          <img v-if="coverPreview(row.cover_url)" :src="coverPreview(row.cover_url)" class="cover-thumb" alt="封面" />
          <span v-else class="cover-empty">无</span>
        </template>
      </el-table-column>
      <el-table-column prop="series_title" label="剧名" min-width="120" />
      <el-table-column label="集数" width="70">
        <template #default="{ row }">第 {{ row.episode_number }} 集</template>
      </el-table-column>
      <el-table-column prop="title" label="单集标题" min-width="120" />
      <el-table-column prop="total_duration" label="时长(秒)" width="100" />
      <el-table-column prop="highlight_count" label="高光点" width="80" />
      <el-table-column label="分支点" width="80">
        <template #default="{ row }">{{ row.branch_point_count ?? 0 }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">
            {{ row.status === 1 ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="520">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" :loading="regeneratingId === row.id" @click="handleRegenerateCover(row)">
            重截封面
          </el-button>
          <el-button size="small" :loading="analyzingId === row.id" @click="handleAnalyze(row.id)">
            AI 分析
          </el-button>
          <el-button size="small" @click="$router.push(`/admin/highlights/${row.id}`)">
            管理高光
          </el-button>
          <el-button size="small" type="warning" @click="$router.push(`/admin/branch-points/${row.id}`)">
            管理分支
          </el-button>
          <el-button
            v-if="row.status !== 1"
            size="small"
            type="success"
            @click="handlePublish(row.id)"
          >
            发布
          </el-button>
          <el-button
            size="small"
            type="danger"
            :loading="deletingId === row.id"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="editVisible" title="编辑视频" width="520px" @closed="resetEditForm">
      <el-form label-width="100px">
        <el-form-item label="剧名" required>
          <el-select
            v-model="editForm.series_title"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入剧名"
            style="width: 100%"
          >
            <el-option
              v-for="s in seriesList"
              :key="s.id"
              :label="s.title"
              :value="s.title"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="集数" required>
          <el-input-number v-model="editForm.episode_number" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单集标题" required>
          <el-input v-model="editForm.title" />
        </el-form-item>
        <el-form-item label="时长(秒)">
          <el-input-number v-model="editForm.total_duration" :min="10" style="width: 100%" />
        </el-form-item>
        <el-form-item label="当前封面">
          <img v-if="coverPreview(editForm.cover_url)" :src="coverPreview(editForm.cover_url)" class="cover-preview" alt="封面" />
          <span v-else class="cover-empty">暂无封面</span>
        </el-form-item>
        <el-form-item label="上传封面">
          <input type="file" accept="image/*" @change="onEditCoverChange" />
        </el-form-item>
        <el-form-item label="剧集封面">
          <el-checkbox v-model="editForm.sync_series">同时设为该剧集海报</el-checkbox>
        </el-form-item>
      </el-form>
      <p class="edit-hint">可将已上传视频归入已有剧集，或上传自定义封面替换视频截图。</p>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingEdit" @click="handleSaveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getAdminVideos, getAdminSeries, uploadVideo, updateVideo,
  publishVideo, analyzeVideo, deleteVideo,
  uploadVideoCover, regenerateVideoCover,
} from '@/api/admin';
import { useSessionStore } from '@/stores/session';
import { isDefaultCoverUrl } from '@/utils/cover';
import { resolveMediaUrl } from '@/utils/media';

const router = useRouter();
const session = useSessionStore();
const videos = ref([]);
const seriesList = ref([]);
const uploading = ref(false);
const analyzingId = ref(null);
const deletingId = ref(null);
const regeneratingId = ref(null);
const editVisible = ref(false);
const savingEdit = ref(false);
const editingId = ref(null);
const uploadForm = ref({
  series_title: '',
  episode_number: 1,
  title: '',
  total_duration: 300,
  videoFile: null,
  coverFile: null,
});
const editForm = ref({
  series_title: '',
  episode_number: 1,
  title: '',
  total_duration: 300,
  cover_url: '',
  coverFile: null,
  sync_series: true,
});

onMounted(async () => {
  await Promise.all([loadVideos(), loadSeries()]);
});

async function loadVideos() {
  const data = await getAdminVideos();
  videos.value = data.list || [];
}

async function loadSeries() {
  const data = await getAdminSeries();
  seriesList.value = data.list || [];
}

function coverPreview(url) {
  if (!url || isDefaultCoverUrl(url)) return '';
  return resolveMediaUrl(url);
}

function titleFromFileName(name) {
  if (!name) return '';
  return name.replace(/\.[^.]+$/, '');
}

function onVideoFileChange(e) {
  const file = e.target.files?.[0];
  uploadForm.value.videoFile = file || null;
  if (file) {
    const name = titleFromFileName(file.name);
    uploadForm.value.title = name;
    if (!uploadForm.value.series_title) {
      uploadForm.value.series_title = name;
    }
  }
}

function onCoverFileChange(e) {
  uploadForm.value.coverFile = e.target.files?.[0] || null;
}

function onEditCoverChange(e) {
  editForm.value.coverFile = e.target.files?.[0] || null;
}

function openEdit(row) {
  editingId.value = row.id;
  editForm.value = {
    series_title: row.series_title || '',
    episode_number: row.episode_number || 1,
    title: row.title || '',
    total_duration: row.total_duration || 300,
    cover_url: row.cover_url || '',
    coverFile: null,
    sync_series: row.episode_number === 1,
  };
  editVisible.value = true;
}

function resetEditForm() {
  editingId.value = null;
  editForm.value = {
    series_title: '',
    episode_number: 1,
    title: '',
    total_duration: 300,
    cover_url: '',
    coverFile: null,
    sync_series: true,
  };
}

async function handleSaveEdit() {
  if (!editForm.value.series_title?.trim() || !editForm.value.title?.trim()) {
    ElMessage.warning('请填写剧名和单集标题');
    return;
  }
  savingEdit.value = true;
  try {
    await updateVideo(editingId.value, {
      series_title: editForm.value.series_title.trim(),
      episode_number: editForm.value.episode_number,
      title: editForm.value.title.trim(),
      total_duration: editForm.value.total_duration,
    });

    if (editForm.value.coverFile) {
      const fd = new FormData();
      fd.append('cover_file', editForm.value.coverFile);
      if (editForm.value.sync_series) {
        fd.append('sync_series', '1');
      }
      await uploadVideoCover(editingId.value, fd);
    }

    ElMessage.success('保存成功');
    editVisible.value = false;
    await Promise.all([loadVideos(), loadSeries()]);
  } finally {
    savingEdit.value = false;
  }
}

async function handleUpload() {
  if (!uploadForm.value.series_title || !uploadForm.value.title || !uploadForm.value.videoFile) {
    ElMessage.warning('请填写剧名、单集标题并选择视频文件');
    return;
  }
  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append('series_title', uploadForm.value.series_title);
    fd.append('episode_number', uploadForm.value.episode_number);
    fd.append('title', uploadForm.value.title);
    fd.append('total_duration', uploadForm.value.total_duration);
    fd.append('video_file', uploadForm.value.videoFile);
    if (uploadForm.value.coverFile) {
      fd.append('cover_file', uploadForm.value.coverFile);
    }
    await uploadVideo(fd);
    ElMessage.success('上传成功');
    uploadForm.value = {
      series_title: '',
      episode_number: 1,
      title: '',
      total_duration: 300,
      videoFile: null,
      coverFile: null,
    };
    await Promise.all([loadVideos(), loadSeries()]);
  } finally {
    uploading.value = false;
  }
}

async function handleRegenerateCover(row) {
  regeneratingId.value = row.id;
  try {
    const data = await regenerateVideoCover(row.id, {
      sync_series: row.episode_number === 1 ? '1' : '0',
    });
    ElMessage.success(data.cover_url?.includes('cover_') ? '已从视频截取封面' : '截帧失败，请检查服务器 ffmpeg');
    await Promise.all([loadVideos(), loadSeries()]);
  } finally {
    regeneratingId.value = null;
  }
}

async function handleAnalyze(id) {
  analyzingId.value = id;
  try {
    const data = await analyzeVideo(id);
    if (data.analyze_source === 'doubao') {
      ElMessage.success(`AI 真实分析完成，识别 ${data.analyzed_count} 个高光点`);
    } else {
      ElMessage.warning(data.analyze_message || '使用了模拟数据，非真实 AI 分析');
    }
    await loadVideos();
  } finally {
    analyzingId.value = null;
  }
}

async function handlePublish(id) {
  await publishVideo(id);
  ElMessage.success('发布成功');
  await loadVideos();
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${row.series_title}」第 ${row.episode_number} 集？将同时删除关联的高光点、观看进度和本地视频文件。`,
      '删除视频',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    );
  } catch {
    return;
  }
  deletingId.value = row.id;
  try {
    await deleteVideo(row.id);
    ElMessage.success('删除成功');
    await loadVideos();
  } finally {
    deletingId.value = null;
  }
}

function logout() {
  session.logout();
  router.push('/admin/login');
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; }
.admin-name { color: #666; margin-right: 8px; font-size: 14px; }
.upload-card { margin-bottom: 8px; }
.upload-card h3 { margin-bottom: 16px; }
.upload-hint { font-size: 12px; color: #999; margin-top: 8px; line-height: 1.6; }
.edit-hint { font-size: 12px; color: #999; margin: 0; line-height: 1.5; }
.cover-thumb {
  width: 48px;
  height: 64px;
  object-fit: cover;
  border-radius: 6px;
  background: #f0f0f0;
}
.cover-preview {
  width: 90px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  background: #f0f0f0;
}
.cover-empty { font-size: 12px; color: #bbb; }
</style>
