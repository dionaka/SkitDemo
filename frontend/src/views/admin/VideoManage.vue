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
        <el-form-item label="标题">
          <el-input v-model="uploadForm.title" placeholder="输入视频标题" />
        </el-form-item>
        <el-form-item label="时长(秒)">
          <el-input-number v-model="uploadForm.total_duration" :min="10" />
        </el-form-item>
        <el-form-item label="视频文件">
          <input type="file" accept="video/*" @change="onFileChange" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="uploading" @click="handleUpload">上传</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-table :data="videos" stripe style="margin-top:20px">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="total_duration" label="时长(秒)" width="100" />
      <el-table-column prop="highlight_count" label="高光点" width="80" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">
            {{ row.status === 1 ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="320">
        <template #default="{ row }">
          <el-button size="small" :loading="analyzingId === row.id" @click="handleAnalyze(row.id)">
            AI 分析
          </el-button>
          <el-button size="small" @click="$router.push(`/admin/highlights/${row.id}`)">
            管理高光
          </el-button>
          <el-button
            v-if="row.status !== 1"
            size="small"
            type="success"
            @click="handlePublish(row.id)"
          >
            发布
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { getAdminVideos, uploadVideo, publishVideo, analyzeVideo } from '@/api/admin';
import { useSessionStore } from '@/stores/session';

const router = useRouter();
const session = useSessionStore();
const videos = ref([]);
const uploading = ref(false);
const analyzingId = ref(null);
const uploadForm = ref({ title: '', total_duration: 300, file: null });

onMounted(loadVideos);

async function loadVideos() {
  const data = await getAdminVideos();
  videos.value = data.list || [];
}

function onFileChange(e) {
  uploadForm.value.file = e.target.files[0];
}

async function handleUpload() {
  if (!uploadForm.value.title || !uploadForm.value.file) {
    ElMessage.warning('请填写标题并选择视频文件');
    return;
  }
  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append('title', uploadForm.value.title);
    fd.append('total_duration', uploadForm.value.total_duration);
    fd.append('video_file', uploadForm.value.file);
    await uploadVideo(fd);
    ElMessage.success('上传成功');
    uploadForm.value = { title: '', total_duration: 300, file: null };
    await loadVideos();
  } finally {
    uploading.value = false;
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
</style>
