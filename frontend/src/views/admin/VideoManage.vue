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
      <el-tabs v-model="uploadMode" class="upload-tabs">
        <el-tab-pane label="本地上传" name="file">
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
              <el-input-number v-model="uploadForm.total_duration" :min="1" />
              <span class="field-hint">选择视频后自动检测，无需手填</span>
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
            不上传封面时，系统会自动从视频第 1 秒截取一帧作为封面；第 1 集封面会同步为剧集海报。上传时会自动检测视频真实时长。
          </p>
        </el-tab-pane>

        <el-tab-pane label="链接解析" name="link">
          <el-collapse v-model="linkPanels" class="link-collapse">
            <el-collapse-item name="cookie" title="B 站 Cookie 配置（链接下载必需）">
              <div v-loading="biliCookieLoading" class="cookie-panel">
                <el-alert type="info" :closable="false" show-icon class="cookie-alert">
                  <template #title>如何获取</template>
                  <p>1. 浏览器登录 <a href="https://www.bilibili.com" target="_blank" rel="noopener">bilibili.com</a></p>
                  <p>2. 按 F12 → Application / 存储 → Cookies → bilibili.com，复制整串 <code>name=value; ...</code></p>
                  <p>3. 或使用扩展「Get cookies.txt LOCALLY」导出；两种格式均支持</p>
                  <p>4. 粘贴下方并保存（需包含 <code>SESSDATA</code>）</p>
                </el-alert>

                <el-form label-width="100px" class="cookie-form">
                  <el-form-item label="配置状态">
                    <el-tag :type="biliCookieStatus.configured ? 'success' : 'warning'">
                      {{ biliCookieStatus.configured ? '已配置' : '未配置' }}
                    </el-tag>
                    <span v-if="biliCookieStatus.updated_at" class="field-hint">
                      更新于 {{ formatTime(biliCookieStatus.updated_at) }}
                    </span>
                  </el-form-item>
                  <el-form-item label="Cookie 内容">
                    <el-input
                      v-model="biliCookieForm.cookies_text"
                      type="textarea"
                      :rows="8"
                      placeholder="直接粘贴整串：buvid3=...; SESSDATA=...; bili_jct=...; sid=..."
                      class="cookie-textarea"
                    />
                  </el-form-item>
                  <el-form-item label="测试链接">
                    <el-input
                      v-model="biliCookieForm.test_url"
                      placeholder="留空则用默认测试 BV 号"
                      style="max-width: 480px"
                    />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" :loading="savingBiliCookie" @click="handleSaveBiliCookie">
                      保存 Cookie
                    </el-button>
                    <el-button
                      :loading="testingBiliCookie"
                      :disabled="!biliCookieStatus.configured && !biliCookieForm.cookies_text?.trim()"
                      @click="handleTestBiliCookie"
                    >
                      测试 Cookie
                    </el-button>
                    <el-button type="danger" plain :disabled="!biliCookieStatus.configured" @click="handleClearBiliCookie">
                      清除
                    </el-button>
                  </el-form-item>
                </el-form>
              </div>
            </el-collapse-item>

            <el-collapse-item name="import" title="粘贴链接并导入">
              <el-form label-width="100px" class="link-form" @submit.prevent="handleLinkImport">
                <el-form-item label="视频链接">
                  <el-input
                    v-model="linkForm.text"
                    type="textarea"
                    :rows="2"
                    placeholder="粘贴 B站 / 抖音 / 小红书 分享链接或整段文案"
                    style="max-width: 560px"
                  />
                </el-form-item>
                <el-form-item label="剧名">
                  <el-select
                    v-model="linkForm.series_title"
                    filterable
                    allow-create
                    default-first-option
                    placeholder="解析后自动填充，可修改"
                    style="width: 280px"
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
                  <el-input-number v-model="linkForm.episode_number" :min="1" />
                </el-form-item>
                <el-form-item label="单集标题">
                  <el-input v-model="linkForm.title" placeholder="解析后自动填充" style="width: 280px" />
                </el-form-item>
                <el-form-item>
                  <el-button :loading="resolvingLink" @click="handleResolveLink">解析预览</el-button>
                  <el-button
                    type="primary"
                    :loading="importingLink"
                    :disabled="!linkPreview?.ok"
                    @click="handleLinkImport"
                  >
                    下载并导入
                  </el-button>
                </el-form-item>
              </el-form>

              <div v-if="linkPreview" class="link-preview">
                <template v-if="linkPreview.ok">
                  <el-tag type="success" size="small">{{ linkPreview.platform_label }}</el-tag>
                  <span class="preview-title">{{ linkPreview.title }}</span>
                  <span v-if="linkPreview.author" class="preview-meta">作者：{{ linkPreview.author }}</span>
                  <span v-if="linkPreview.duration_seconds" class="preview-meta">
                    时长：{{ linkPreview.duration_seconds }} 秒
                  </span>
                  <img
                    v-if="linkPreviewThumb"
                    :src="linkPreviewThumb"
                    class="preview-thumb"
                    alt="封面预览"
                    @error="onPreviewThumbError"
                  />
                  <span v-else-if="linkPreview.thumbnail_remote" class="preview-meta">封面加载失败（导入时仍会尝试下载）</span>
                  <el-alert
                    v-if="linkPreview.hint"
                    :title="linkPreview.hint"
                    :type="linkPreview.download_requires_cookie ? 'warning' : 'info'"
                    show-icon
                    :closable="false"
                    class="preview-hint"
                  />
                </template>
                <el-alert v-else :title="linkPreview.message || '解析失败'" type="warning" show-icon :closable="false" />
              </div>

              <p class="upload-hint">
                支持 B站、抖音、小红书视频链接。B 站下载需先在上方配置 Cookie。
              </p>
            </el-collapse-item>
          </el-collapse>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <div class="batch-toolbar">
      <span class="batch-label">批量高光</span>
      <el-button
        type="primary"
        :disabled="!selectedVideos.length || batchRunning"
        @click="runBatchAnalyze('selected')"
      >
        分析所选 ({{ selectedVideos.length }})
      </el-button>
      <el-button :disabled="batchRunning" @click="runBatchAnalyze('missing')">
        分析无高光视频
      </el-button>
      <el-button :disabled="batchRunning" @click="runBatchAnalyze('published')">
        分析全部已发布
      </el-button>
      <el-button :loading="batchRunning" @click="runBatchAnalyze('all')">
        分析全部视频
      </el-button>
    </div>

    <el-table
      ref="tableRef"
      :data="videos"
      stripe
      style="margin-top:12px"
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" width="48" />
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
      <el-table-column label="评论" width="70">
        <template #default="{ row }">{{ row.comment_count ?? 0 }}</template>
      </el-table-column>
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
      <el-table-column label="操作" width="580">
        <template #default="{ row }">
          <el-button size="small" @click="openComments(row)">评论</el-button>
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

    <el-dialog
      v-model="batchDialogVisible"
      title="批量 AI 高光分析"
      width="480"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="!batchRunning"
    >
      <p v-if="batchProgress.total" class="batch-current">
        正在处理：{{ batchProgress.current || '…' }}
      </p>
      <el-progress
        v-if="batchProgress.total"
        :percentage="Math.round((batchProgress.done / batchProgress.total) * 100)"
        :status="batchRunning ? undefined : (batchProgress.fail ? 'warning' : 'success')"
      />
      <ul v-if="batchProgress.total && !batchRunning" class="batch-summary">
        <li>共 {{ batchProgress.total }} 个视频</li>
        <li>AI 分析成功 {{ batchProgress.ok }} 个</li>
        <li v-if="batchProgress.mock">模拟数据 {{ batchProgress.mock }} 个（请检查 API 配置）</li>
        <li v-if="batchProgress.fail">失败 {{ batchProgress.fail }} 个</li>
      </ul>
      <p v-else-if="!batchProgress.total" class="batch-hint">点击开始后依次分析，请勿关闭页面。</p>
      <template #footer>
        <el-button v-if="!batchRunning" type="primary" @click="batchDialogVisible = false">关闭</el-button>
        <el-button v-else disabled>分析进行中…</el-button>
      </template>
    </el-dialog>

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

    <el-dialog v-model="commentDialogVisible" :title="commentDialogTitle" width="640px">
      <div v-loading="commentLoading">
        <el-empty v-if="!commentLoading && adminComments.length === 0" description="暂无评论" />
        <ul v-else class="admin-comment-list">
          <li v-for="c in adminComments" :key="c.id" class="admin-comment-item">
            <div class="admin-comment-head">
              <strong>{{ c.user?.username }}</strong>
              <span class="admin-comment-time">{{ c.created_at }}</span>
              <el-button
                size="small"
                type="danger"
                text
                :loading="adminCommentDeletingId === c.id"
                @click="handleAdminDeleteComment(c.id)"
              >
                删除
              </el-button>
            </div>
            <p class="admin-comment-body">{{ c.content }}</p>
          </li>
        </ul>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getAdminVideos, getAdminSeries, uploadVideo, updateVideo,
  publishVideo, analyzeVideo, deleteVideo,
  uploadVideoCover, regenerateVideoCover,
  resolveVideoLink, importVideoFromLink,
  getBiliCookiesSettings, saveBiliCookiesSettings,
  testBiliCookiesSettings, deleteBiliCookiesSettings,
  getAdminVideoComments, deleteAdminComment,
} from '@/api/admin';
import { useSessionStore } from '@/stores/session';
import { isDefaultCoverUrl } from '@/utils/cover';
import { resolveMediaUrl } from '@/utils/media';

const router = useRouter();
const session = useSessionStore();
const videos = ref([]);
const seriesList = ref([]);
const uploadMode = ref('file');
const uploading = ref(false);
const resolvingLink = ref(false);
const importingLink = ref(false);
const linkPreview = ref(null);
const linkPreviewThumbBroken = ref(false);
const linkPanels = ref(['cookie', 'import']);
const biliCookieLoading = ref(false);
const savingBiliCookie = ref(false);
const testingBiliCookie = ref(false);
const biliCookieStatus = ref({ configured: false });
const biliCookieForm = ref({
  cookies_text: '',
  test_url: '',
});
const commentDialogVisible = ref(false);
const commentLoading = ref(false);
const adminComments = ref([]);
const adminCommentDeletingId = ref(null);
const commentVideoRow = ref(null);
const analyzingId = ref(null);
const tableRef = ref(null);
const selectedVideos = ref([]);
const batchRunning = ref(false);
const batchDialogVisible = ref(false);
const batchProgress = ref({ done: 0, total: 0, current: '', ok: 0, mock: 0, fail: 0 });
const deletingId = ref(null);
const regeneratingId = ref(null);
const editVisible = ref(false);
const savingEdit = ref(false);
const editingId = ref(null);
const uploadForm = ref({
  series_title: '',
  episode_number: 1,
  title: '',
  total_duration: 60,
  videoFile: null,
  coverFile: null,
});
const linkForm = ref({
  text: '',
  series_title: '',
  episode_number: 1,
  title: '',
});
const editForm = ref({
  series_title: '',
  episode_number: 1,
  title: '',
  total_duration: 60,
  cover_url: '',
  coverFile: null,
  sync_series: true,
});

onMounted(async () => {
  await Promise.all([loadVideos(), loadSeries(), loadBiliCookieSettings()]);
});

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function loadBiliCookieSettings() {
  biliCookieLoading.value = true;
  try {
    const data = await getBiliCookiesSettings();
    biliCookieStatus.value = data;
    biliCookieForm.value.cookies_text = data.cookies_text || '';
  } finally {
    biliCookieLoading.value = false;
  }
}

async function handleSaveBiliCookie() {
  if (!biliCookieForm.value.cookies_text?.trim()) {
    ElMessage.warning('请粘贴 Cookie 内容');
    return;
  }
  savingBiliCookie.value = true;
  try {
    const data = await saveBiliCookiesSettings({
      cookies_text: biliCookieForm.value.cookies_text,
    });
    biliCookieStatus.value = { ...biliCookieStatus.value, ...data };
    ElMessage.success('B 站 Cookie 已保存');
  } catch (err) {
    ElMessage.error(err.message || '保存失败');
  } finally {
    savingBiliCookie.value = false;
  }
}

async function handleTestBiliCookie() {
  if (!biliCookieStatus.value.configured && biliCookieForm.value.cookies_text?.trim()) {
    await handleSaveBiliCookie();
    if (!biliCookieStatus.value.configured) return;
  }
  testingBiliCookie.value = true;
  try {
    const data = await testBiliCookiesSettings({
      test_url: biliCookieForm.value.test_url?.trim() || undefined,
    });
    ElMessage.success(data.title ? `Cookie 有效：${data.title}` : 'Cookie 有效');
  } catch (err) {
    ElMessage.error(err.message || 'Cookie 测试失败');
  } finally {
    testingBiliCookie.value = false;
  }
}

async function handleClearBiliCookie() {
  try {
    await ElMessageBox.confirm('确定清除已保存的 B 站 Cookie？', '清除 Cookie', {
      type: 'warning',
      confirmButtonText: '清除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }
  const data = await deleteBiliCookiesSettings();
  biliCookieStatus.value = data;
  biliCookieForm.value.cookies_text = '';
  ElMessage.success('已清除');
}

async function openComments(row) {
  commentVideoRow.value = row;
  commentDialogVisible.value = true;
  commentLoading.value = true;
  adminComments.value = [];
  try {
    const data = await getAdminVideoComments(row.id, { page: 1, size: 100 });
    adminComments.value = data.list || [];
  } finally {
    commentLoading.value = false;
  }
}

async function handleAdminDeleteComment(commentId) {
  try {
    await ElMessageBox.confirm('确定删除该评论？', '删除评论', { type: 'warning' });
  } catch {
    return;
  }
  adminCommentDeletingId.value = commentId;
  try {
    await deleteAdminComment(commentId);
    adminComments.value = adminComments.value.filter((c) => c.id !== commentId);
    if (commentVideoRow.value) {
      commentVideoRow.value.comment_count = Math.max(0, (commentVideoRow.value.comment_count || 1) - 1);
    }
    await loadVideos();
    ElMessage.success('已删除');
  } finally {
    adminCommentDeletingId.value = null;
  }
}

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

const linkPreviewThumb = computed(() => {
  if (linkPreviewThumbBroken.value || !linkPreview.value?.thumbnail) return '';
  return coverPreview(linkPreview.value.thumbnail);
});

const commentDialogTitle = computed(() => {
  const row = commentVideoRow.value;
  if (!row) return '评论管理';
  return `评论管理 · ${row.series_title} 第${row.episode_number}集`;
});

function onPreviewThumbError() {
  linkPreviewThumbBroken.value = true;
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
    probeLocalVideoDuration(file).then((sec) => {
      if (sec) uploadForm.value.total_duration = sec;
    });
  }
}

function probeLocalVideoDuration(file) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      const sec = Math.round(video.duration);
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(sec) && sec > 0 ? sec : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
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
    total_duration: row.total_duration || 60,
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
    total_duration: 60,
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

async function handleResolveLink() {
  if (!linkForm.value.text?.trim()) {
    ElMessage.warning('请粘贴视频链接');
    return;
  }
  resolvingLink.value = true;
  linkPreviewThumbBroken.value = false;
  try {
    const data = await resolveVideoLink({ text: linkForm.value.text.trim() });
    linkPreview.value = { ok: true, ...data };
    if (!linkForm.value.title) linkForm.value.title = data.title || '';
    if (!linkForm.value.series_title) linkForm.value.series_title = data.title || '';
    ElMessage.success(`已识别 ${data.platform_label} 视频`);
  } catch (err) {
    const msg = err?.response?.data?.message || err.message || '解析失败';
    linkPreview.value = { ok: false, message: msg };
    ElMessage.error(msg);
  } finally {
    resolvingLink.value = false;
  }
}

async function handleLinkImport() {
  if (!linkForm.value.text?.trim()) {
    ElMessage.warning('请粘贴视频链接');
    return;
  }
  if (!linkForm.value.series_title?.trim() || !linkForm.value.title?.trim()) {
    ElMessage.warning('请填写剧名和单集标题');
    return;
  }
  importingLink.value = true;
  try {
    if (!linkPreview.value?.ok) {
      await handleResolveLink();
      if (!linkPreview.value?.ok) return;
    }
    await importVideoFromLink({
      text: linkForm.value.text.trim(),
      series_title: linkForm.value.series_title.trim(),
      title: linkForm.value.title.trim(),
      episode_number: linkForm.value.episode_number,
    });
    ElMessage.success('链接视频导入成功');
    linkForm.value = { text: '', series_title: '', episode_number: 1, title: '' };
    linkPreview.value = null;
    await Promise.all([loadVideos(), loadSeries()]);
  } catch (err) {
    ElMessage.error(err?.response?.data?.message || err.message || '导入失败');
  } finally {
    importingLink.value = false;
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
      total_duration: 60,
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
  } catch (e) {
    ElMessage.error(e.message || '分析失败');
  } finally {
    analyzingId.value = null;
  }
}

function onSelectionChange(rows) {
  selectedVideos.value = rows || [];
}

function pickBatchTargets(mode) {
  const list = videos.value || [];
  if (mode === 'selected') return [...selectedVideos.value];
  if (mode === 'published') return list.filter((v) => v.status === 1 && v.video_url);
  if (mode === 'missing') return list.filter((v) => v.video_url && (v.highlight_count ?? 0) === 0);
  if (mode === 'all') return list.filter((v) => v.video_url);
  return [];
}

async function runBatchAnalyze(mode) {
  if (batchRunning.value) return;

  const targets = pickBatchTargets(mode);
  if (!targets.length) {
    ElMessage.info('没有符合条件的视频');
    return;
  }

  const modeLabels = {
    selected: '所选',
    missing: '尚无高光',
    published: '已发布',
    all: '全部',
  };

  try {
    await ElMessageBox.confirm(
      `将对 ${targets.length} 个${modeLabels[mode] || ''}视频依次执行 AI 高光分析。\n`
      + '已有 AI 视频高光会被重新生成；手动/弹幕高光不受影响。\n'
      + '过程可能较久，请勿关闭页面。',
      '批量 AI 高光分析',
      { confirmButtonText: '开始', cancelButtonText: '取消', type: 'info' },
    );
  } catch {
    return;
  }

  batchRunning.value = true;
  batchDialogVisible.value = true;
  batchProgress.value = { done: 0, total: targets.length, current: '', ok: 0, mock: 0, fail: 0 };

  for (const video of targets) {
    batchProgress.value.current = `${video.series_title} · 第 ${video.episode_number} 集`;
    try {
      const data = await analyzeVideo(video.id);
      if (data.analyze_source === 'doubao') {
        batchProgress.value.ok += 1;
      } else {
        batchProgress.value.mock += 1;
      }
    } catch {
      batchProgress.value.fail += 1;
    }
    batchProgress.value.done += 1;
  }

  batchRunning.value = false;
  batchProgress.value.current = '已完成';
  await loadVideos();
  tableRef.value?.clearSelection?.();

  const { ok, mock, fail, total } = batchProgress.value;
  if (fail === 0 && mock === 0) {
    ElMessage.success(`批量分析完成，${ok}/${total} 个视频已生成 AI 高光`);
  } else {
    ElMessage.warning(`批量完成：AI 成功 ${ok}，模拟 ${mock}，失败 ${fail}`);
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
.batch-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.batch-label { font-size: 13px; color: #606266; font-weight: 600; }
.batch-current { margin: 0 0 12px; font-size: 14px; color: #303133; }
.batch-summary { margin: 12px 0 0; padding-left: 18px; color: #606266; font-size: 13px; line-height: 1.8; }
.batch-hint { margin: 0; color: #909399; font-size: 13px; }
.admin-name { color: #666; margin-right: 8px; font-size: 14px; }
.upload-card { margin-bottom: 8px; }
.upload-card h3 { margin-bottom: 16px; }
.upload-hint { font-size: 12px; color: #999; margin-top: 8px; line-height: 1.6; }
.field-hint { margin-left: 8px; font-size: 12px; color: #999; }
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
.upload-tabs { margin-top: 4px; }
.link-form { max-width: 720px; }
.link-preview {
  margin: 12px 0 0;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.preview-title { font-weight: 600; max-width: 360px; }
.preview-meta { font-size: 13px; color: #666; }
.preview-thumb {
  width: 120px;
  height: 68px;
  object-fit: cover;
  border-radius: 6px;
  margin-left: auto;
}
.preview-hint { flex-basis: 100%; margin-top: 4px; }
.link-collapse { max-width: 760px; margin-bottom: 8px; }
.cookie-panel { padding-top: 4px; }
.cookie-alert { margin-bottom: 16px; }
.cookie-alert p { margin: 4px 0; font-size: 13px; line-height: 1.5; }
.cookie-form { max-width: 720px; }
.cookie-textarea :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
.admin-comment-list { list-style: none; margin: 0; padding: 0; max-height: 420px; overflow: auto; }
.admin-comment-item { padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.admin-comment-head { display: flex; align-items: center; gap: 10px; }
.admin-comment-time { font-size: 12px; color: #999; flex: 1; }
.admin-comment-body { margin: 8px 0 0; white-space: pre-wrap; word-break: break-word; line-height: 1.5; }
</style>
