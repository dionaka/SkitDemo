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

    <button
      v-if="session.isLoggedIn"
      type="button"
      class="theme-entry card"
      @click="router.push('/settings')"
    >
      <div class="theme-entry-text">
        <span class="theme-entry-title">个性主题</span>
        <span class="theme-entry-desc">导入 bilibili-skin 格式主题</span>
      </div>
      <span class="theme-entry-arrow">›</span>
    </button>

    <div v-else class="guest-card card">
      <UserAvatar username="" avatar-url="" size="lg" />
      <h1 class="profile-name">未登录</h1>
      <p class="profile-desc">登录后可同步观看进度</p>
      <button type="button" class="btn btn-primary" @click="router.push('/login')">登录 / 注册</button>
    </div>

    <section v-if="session.isLoggedIn" class="favorites-section">
      <div class="section-header">
        <h2 class="section-title">我的收藏</h2>
        <span v-if="favorites.length" class="section-more">{{ favorites.length }} 部</span>
      </div>

      <div v-if="favoritesLoading" class="loading-box compact">
        <div class="loading-spinner" />
      </div>

      <div v-else-if="favorites.length === 0" class="favorites-empty card">
        还没有收藏，去选集页点「收藏」吧
      </div>

      <div v-else class="favorites-scroll">
        <div
          v-for="item in favorites"
          :key="item.id"
          class="favorite-item"
          @click="router.push(`/series/${item.id}`)"
        >
          <SeriesCover
            class="favorite-cover"
            variant="thumb"
            :cover-url="item.cover_url"
            :title="item.title"
          />
          <div class="favorite-title">{{ item.title }}</div>
          <div class="favorite-meta">{{ item.episode_count }} 集</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PageBackBar from '@/components/PageBackBar.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import SeriesCover from '@/components/SeriesCover.vue';
import { getProfile, uploadAvatar } from '@/api/auth';
import { persistAvatarFromFile } from '@/services/userAppearanceCache';
import { getFavoriteSeries } from '@/api/engagement';
import { useSessionStore } from '@/stores/session';
import { smartBack } from '@/utils/navigation';

const router = useRouter();
const session = useSessionStore();
const fileRef = ref(null);
const uploading = ref(false);
const createdAt = ref('');
const favorites = ref([]);
const favoritesLoading = ref(false);

const createdAtLabel = computed(() => {
  if (!createdAt.value) return '';
  const date = new Date(createdAt.value);
  if (Number.isNaN(date.getTime())) return createdAt.value;
  return date.toLocaleDateString('zh-CN');
});

onMounted(async () => {
  await refreshProfile();
  await loadFavorites();
});

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

async function loadFavorites() {
  if (!session.isLoggedIn) return;
  favoritesLoading.value = true;
  try {
    const data = await getFavoriteSeries(session.userSessionId);
    favorites.value = data.list || [];
  } catch {
    favorites.value = [];
  } finally {
    favoritesLoading.value = false;
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
    persistAvatarFromFile(data.avatar_url, file).catch(() => {});
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
  margin-bottom: 20px;
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

.theme-entry {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.theme-entry:active {
  background: var(--bg-card-hover);
}

.theme-entry-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.theme-entry-title {
  font-size: 15px;
  font-weight: 700;
}

.theme-entry-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.theme-entry-arrow {
  font-size: 22px;
  color: var(--text-muted);
  line-height: 1;
}

.favorites-section {
  margin-top: 4px;
}

.loading-box.compact {
  min-height: 120px;
}

.favorites-empty {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  padding: 24px 16px;
}

.favorites-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin: 0 -16px;
  padding-left: 16px;
  padding-right: 16px;
  scrollbar-width: none;
}

.favorites-scroll::-webkit-scrollbar {
  display: none;
}

.favorite-item {
  flex-shrink: 0;
  width: 100px;
}

.favorite-item:active {
  opacity: 0.85;
}

.favorite-cover {
  width: 100px;
}

.favorite-title {
  font-size: 12px;
  font-weight: 600;
  margin-top: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.favorite-meta {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
}
</style>
