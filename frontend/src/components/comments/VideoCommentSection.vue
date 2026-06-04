<template>
  <div class="comment-section highlight-list">
    <h3>评论 <span v-if="total > 0" class="comment-count">({{ total }})</span></h3>

    <div v-if="isLoggedIn" class="comment-compose">
      <textarea
        v-model="draft"
        class="comment-input"
        rows="3"
        maxlength="500"
        placeholder="说点什么…（2-500 字）"
        @keydown.ctrl.enter="submitComment"
      />
      <div class="compose-actions">
        <span class="char-count">{{ draft.length }}/500</span>
        <el-button type="primary" size="small" :loading="submitting" :disabled="draft.trim().length < 2" @click="submitComment">
          发送
        </el-button>
      </div>
    </div>
    <p v-else class="comment-login-hint">
      <el-button link type="primary" @click="goLogin">登录后参与评论</el-button>
    </p>

    <div v-if="loading" v-loading="true" style="min-height: 80px" />
    <ul v-else-if="comments.length" class="comment-list">
      <li v-for="item in comments" :key="item.id" class="comment-item">
        <div class="comment-head">
          <img v-if="avatarUrl(item.user?.avatar_url)" :src="avatarUrl(item.user?.avatar_url)" class="avatar" alt="" />
          <span v-else class="avatar avatar-fallback">{{ initials(item.user?.username) }}</span>
          <div class="meta">
            <strong>{{ item.user?.username || '用户' }}</strong>
            <span class="time">{{ formatTime(item.created_at) }}</span>
          </div>
          <el-button
            v-if="item.can_delete"
            link
            type="danger"
            size="small"
            :loading="deletingId === item.id"
            @click="removeComment(item.id)"
          >
            删除
          </el-button>
        </div>
        <p class="comment-body">{{ item.content }}</p>
      </li>
    </ul>
    <p v-else class="comment-empty">暂无评论</p>

    <el-button v-if="hasMore && !loading" text :loading="loadingMore" @click="loadMore">加载更多</el-button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useSessionStore } from '@/stores/session';
import { getVideoComments, postVideoComment, deleteVideoComment } from '@/api/comments';
import { resolveMediaUrl } from '@/utils/media';

const props = defineProps({
  videoId: { type: [Number, String], required: true },
});

const session = useSessionStore();

const comments = ref([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const loadingMore = ref(false);
const submitting = ref(false);
const deletingId = ref(null);
const draft = ref('');

const isLoggedIn = computed(() => String(session.userSessionId || '').startsWith('user_'));
const hasMore = computed(() => comments.value.length < total.value);

function avatarUrl(url) {
  return url ? resolveMediaUrl(url) : '';
}

function initials(name) {
  return String(name || 'U').slice(0, 1).toUpperCase();
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function fetchComments(reset = false) {
  if (!props.videoId) return;
  if (reset) {
    page.value = 1;
    loading.value = true;
  } else {
    loadingMore.value = true;
  }
  try {
    const data = await getVideoComments(props.videoId, {
      userSessionId: session.userSessionId,
      page: page.value,
      size: 20,
    });
    total.value = data.total || 0;
    const list = data.list || [];
    comments.value = reset ? list : [...comments.value, ...list];
  } catch (err) {
    ElMessage.error(err.message || '评论加载失败');
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

async function loadMore() {
  page.value += 1;
  await fetchComments(false);
}

async function submitComment() {
  const text = draft.value.trim();
  if (text.length < 2) return;
  submitting.value = true;
  try {
    const comment = await postVideoComment(props.videoId, session.userSessionId, text);
    comments.value = [comment, ...comments.value];
    total.value += 1;
    draft.value = '';
    ElMessage.success('评论成功');
  } catch (err) {
    ElMessage.error(err.message || '发送失败');
  } finally {
    submitting.value = false;
  }
}

async function removeComment(id) {
  deletingId.value = id;
  try {
    await deleteVideoComment(id, session.userSessionId);
    comments.value = comments.value.filter((c) => c.id !== id);
    total.value = Math.max(0, total.value - 1);
    ElMessage.success('已删除');
  } catch (err) {
    ElMessage.error(err.message || '删除失败');
  } finally {
    deletingId.value = null;
  }
}

function goLogin() {
  ElMessage.info('请在移动端 App 登录账号后再评论');
}

watch(() => props.videoId, () => fetchComments(true));
onMounted(() => fetchComments(true));
</script>

<style scoped>
.comment-section { margin-top: 20px; }
.comment-count { font-weight: normal; color: #999; font-size: 14px; }
.comment-compose { margin: 12px 0 16px; }
.comment-input {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
}
.compose-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.char-count { font-size: 12px; color: #999; }
.comment-list { list-style: none; padding: 0; margin: 0; }
.comment-item { padding: 12px 0; border-top: 1px solid #f0f0f0; }
.comment-head { display: flex; align-items: center; gap: 10px; }
.avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
.avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffeef2;
  color: #e91e63;
  font-weight: 600;
}
.meta { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.time { font-size: 12px; color: #999; }
.comment-body {
  margin: 8px 0 0 46px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.55;
}
.comment-empty { color: #999; font-size: 14px; }
</style>
