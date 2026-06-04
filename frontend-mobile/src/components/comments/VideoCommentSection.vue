<template>
  <div v-show="visible" class="comment-section card">
    <h3>评论 <span v-if="total > 0" class="comment-count">{{ total }}</span></h3>

    <div v-if="isLoggedIn" class="comment-compose">
      <textarea
        v-model="draft"
        class="comment-input"
        rows="3"
        maxlength="500"
        placeholder="说点什么…（2-500 字）"
        @keydown.enter.exact.prevent="submitComment"
      />
      <div class="compose-actions">
        <span class="char-count">{{ draft.length }}/500</span>
        <button type="button" class="submit-btn" :disabled="submitting || draft.trim().length < 2" @click="submitComment">
          {{ submitting ? '发送中…' : '发送' }}
        </button>
      </div>
    </div>
    <div v-else class="comment-login-hint">
      <button type="button" class="link-btn" @click="goLogin">登录后参与评论</button>
    </div>

    <div v-if="loading" class="comment-loading">加载评论…</div>
    <ul v-else-if="comments.length" class="comment-list">
      <li v-for="item in comments" :key="item.id" class="comment-item">
        <div class="comment-head">
          <img v-if="avatarUrl(item.user?.avatar_url)" :src="avatarUrl(item.user?.avatar_url)" class="avatar" alt="" />
          <span v-else class="avatar avatar-fallback">{{ initials(item.user?.username) }}</span>
          <div class="meta">
            <span class="username">{{ item.user?.username || '用户' }}</span>
            <span class="time">{{ formatTime(item.created_at) }}</span>
          </div>
          <button
            v-if="item.can_delete"
            type="button"
            class="delete-btn"
            :disabled="deletingId === item.id"
            @click="removeComment(item.id)"
          >
            删除
          </button>
        </div>
        <p class="comment-body">{{ item.content }}</p>
      </li>
    </ul>
    <p v-else class="comment-empty">暂无评论，来抢沙发吧</p>

    <button
      v-if="hasMore && !loading"
      type="button"
      class="load-more"
      :disabled="loadingMore"
      @click="loadMore"
    >
      {{ loadingMore ? '加载中…' : '加载更多' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { getVideoComments, postVideoComment, deleteVideoComment } from '@/api/comments';
import { resolveMediaUrl } from '@/config/server';

const props = defineProps({
  videoId: { type: [Number, String], required: true },
  visible: { type: Boolean, default: true },
});

const emit = defineEmits(['toast']);

const router = useRouter();
const session = useSessionStore();

const comments = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const loading = ref(false);
const loadingMore = ref(false);
const submitting = ref(false);
const deletingId = ref(null);
const draft = ref('');

const isLoggedIn = computed(() => session.isLoggedIn);
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
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function toast(msg) {
  emit('toast', msg);
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
      size: pageSize,
    });
    total.value = data.total || 0;
    const list = data.list || [];
    comments.value = reset ? list : [...comments.value, ...list];
  } catch (err) {
    toast(err.message || '评论加载失败');
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

async function loadMore() {
  if (!hasMore.value || loadingMore.value) return;
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
    toast('评论成功');
  } catch (err) {
    toast(err.message || '发送失败');
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
    toast('已删除');
  } catch (err) {
    toast(err.message || '删除失败');
  } finally {
    deletingId.value = null;
  }
}

function goLogin() {
  router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } });
}

watch(() => props.videoId, () => fetchComments(true));

onMounted(() => fetchComments(true));
</script>

<style scoped>
.comment-section {
  margin-top: 12px;
  padding: 16px;
}
.comment-section h3 {
  font-size: 16px;
  margin-bottom: 12px;
}
.comment-count {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: normal;
}
.comment-compose {
  margin-bottom: 16px;
}
.comment-input {
  width: 100%;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text-primary);
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  min-height: 72px;
}
.compose-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.char-count {
  font-size: 12px;
  color: var(--text-muted);
}
.submit-btn {
  border: none;
  border-radius: 999px;
  padding: 8px 18px;
  background: var(--accent-gradient);
  color: #fff;
  font-size: 14px;
}
.submit-btn:disabled {
  opacity: 0.5;
}
.comment-login-hint {
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text-secondary);
}
.link-btn {
  border: none;
  background: none;
  color: var(--accent);
  font-size: 14px;
  padding: 0;
}
.comment-loading,
.comment-empty {
  font-size: 13px;
  color: var(--text-muted);
  padding: 8px 0;
}
.comment-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.comment-item {
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
.comment-item:first-child {
  border-top: none;
  padding-top: 0;
}
.comment-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
}
.meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.username {
  font-size: 14px;
  font-weight: 600;
}
.time {
  font-size: 11px;
  color: var(--text-muted);
}
.delete-btn {
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 12px;
  padding: 4px;
}
.comment-body {
  margin: 8px 0 0 42px;
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.load-more {
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
