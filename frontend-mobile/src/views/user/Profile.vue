<template>
  <div class="profile-page">
    <PageBackBar label="返回" @back="goBack" />

    <div v-if="session.isLoggedIn" class="profile-card card">
      <button type="button" class="avatar-upload" :disabled="uploading" @click="pickAvatar">
        <UserAvatar
          :username="session.username"
          :avatar-url="session.avatarUrl"
          size="lg"
          clickable
        />
        <span class="avatar-edit">{{ uploading ? '上传中...' : '更换头像' }}</span>
      </button>
      <input
        ref="fileRef"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="hidden-input"
        @change="onAvatarSelected"
      />

      <h1 class="profile-name">{{ session.username }}</h1>
      <p class="profile-desc">已登录 · 观看进度已绑定账号</p>

      <div class="profile-meta card-inner">
        <div class="meta-row">
          <span class="meta-label">用户 ID</span>
          <span class="meta-value">{{ session.userId || '—' }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">注册时间</span>
          <span class="meta-value">{{ createdAtLabel }}</span>
        </div>
      </div>

      <button type="button" class="btn btn-ghost logout-btn" @click="handleLogout">退出登录</button>
    </div>

    <div v-else class="guest-card card">
      <UserAvatar username="" avatar-url="" size="lg" />
      <h1 class="profile-name">未登录</h1>
      <p class="profile-desc">登录后可同步观看进度，换设备也能接着看</p>
      <button type="button" class="btn btn-primary" @click="router.push('/login')">登录 / 注册</button>
    </div>

    <section v-if="session.isLoggedIn" class="section">
      <div class="section-header">
        <h2 class="section-title">账号数据</h2>
      </div>
      <div class="info-card card">
        <p>当前账号会保存：</p>
        <ul>
          <li>用户名与头像</li>
          <li>稳定的会话 ID（用于同步观看进度）</li>
          <li>各集播放位置（watch_progress）</li>
          <li>高光互动与分支选择记录</li>
        </ul>
        <p class="info-note">收藏等功能将基于用户 ID 扩展，后续可直接接入。</p>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">快捷入口</h2>
      </div>
      <button type="button" class="link-row" @click="router.push('/search')">
        <span>搜索短剧</span>
        <span class="arrow">›</span>
      </button>
      <button type="button" class="link-row" @click="router.push('/settings')">
        <span>设置</span>
        <span class="arrow">›</span>
      </button>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PageBackBar from '@/components/PageBackBar.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import { getProfile, uploadAvatar } from '@/api/auth';
import { useSessionStore } from '@/stores/session';
import { smartBack } from '@/utils/navigation';

const router = useRouter();
const session = useSessionStore();
const fileRef = ref(null);
const uploading = ref(false);
const createdAt = ref('');

const createdAtLabel = computed(() => {
  if (!createdAt.value) return '—';
  const date = new Date(createdAt.value);
  if (Number.isNaN(date.getTime())) return createdAt.value;
  return date.toLocaleDateString('zh-CN');
});

onMounted(refreshProfile);

async function refreshProfile() {
  if (!session.isLoggedIn) return;
  try {
    const data = await getProfile(session.userSessionId);
    session.setUser(data);
    createdAt.value = data.created_at || '';
  } catch {
    /* ignore */
  }
}

function goBack() {
  smartBack(router, '/');
}

function pickAvatar() {
  fileRef.value?.click();
}

async function onAvatarSelected(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file || !session.isLoggedIn) return;

  uploading.value = true;
  try {
    const data = await uploadAvatar(session.userSessionId, file);
    session.setUser(data);
  } catch (e) {
    window.alert(e.message || '头像上传失败');
  } finally {
    uploading.value = false;
  }
}

function handleLogout() {
  session.logout();
  router.replace('/');
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: calc(12px + var(--safe-top)) 16px calc(24px + var(--safe-bottom));
}

.profile-card,
.guest-card {
  text-align: center;
  padding: 28px 20px;
  margin-bottom: 24px;
}

.avatar-upload {
  border: none;
  background: transparent;
  padding: 0;
  margin: 0 auto 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: inherit;
}

.avatar-edit {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
}

.hidden-input {
  display: none;
}

.profile-name {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 8px;
}

.profile-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}

.profile-meta {
  text-align: left;
  margin-bottom: 16px;
}

.card-inner {
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  background: var(--bg-base);
  border: 1px solid var(--border);
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  padding: 6px 0;
}

.meta-label {
  color: var(--text-muted);
}

.meta-value {
  color: var(--text-primary);
  font-weight: 600;
}

.logout-btn {
  width: 100%;
}

.info-card {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.info-card ul {
  margin: 10px 0 10px 18px;
}

.info-note {
  margin-top: 10px;
  color: var(--text-muted);
  font-size: 12px;
}

.link-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  margin-bottom: 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
}

.link-row:active {
  background: var(--bg-card-hover);
}

.arrow {
  color: var(--text-muted);
  font-size: 20px;
}
</style>
