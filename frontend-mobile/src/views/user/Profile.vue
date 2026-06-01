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
      <p v-if="createdAtLabel" class="profile-desc">注册于 {{ createdAtLabel }}</p>

      <button type="button" class="btn btn-ghost logout-btn" @click="handleLogout">退出登录</button>
    </div>

    <div v-else class="guest-card card">
      <UserAvatar username="" avatar-url="" size="lg" />
      <h1 class="profile-name">未登录</h1>
      <p class="profile-desc">登录后可同步观看进度</p>
      <button type="button" class="btn btn-primary" @click="router.push('/login')">登录 / 注册</button>
    </div>
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
  if (!createdAt.value) return '';
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
  padding: 36px 24px;
}

.avatar-upload {
  border: none;
  background: transparent;
  padding: 0;
  margin: 0 auto 16px;
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
  margin-bottom: 24px;
}

.logout-btn {
  width: 100%;
  max-width: 280px;
}
</style>
