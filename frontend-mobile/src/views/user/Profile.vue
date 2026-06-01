<template>
  <div class="profile-page">
    <PageBackBar label="返回" @back="goBack" />

    <div v-if="session.isLoggedIn" class="profile-card card">
      <div class="avatar-large">{{ avatarLetter }}</div>
      <h1 class="profile-name">{{ session.username }}</h1>
      <p class="profile-desc">已登录，观看进度将同步到此账号</p>
      <button type="button" class="btn btn-ghost logout-btn" @click="handleLogout">退出登录</button>
    </div>

    <div v-else class="guest-card card">
      <div class="avatar-large guest">?</div>
      <h1 class="profile-name">未登录</h1>
      <p class="profile-desc">登录后可同步观看进度，换设备也能接着看</p>
      <button type="button" class="btn btn-primary" @click="router.push('/login')">登录 / 注册</button>
    </div>

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
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import PageBackBar from '@/components/PageBackBar.vue';
import { useSessionStore } from '@/stores/session';
import { smartBack } from '@/utils/navigation';

const router = useRouter();
const session = useSessionStore();

const avatarLetter = computed(() => {
  const name = session.username || '';
  return name.slice(0, 1).toUpperCase() || 'U';
});

function goBack() {
  smartBack(router, '/');
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

.avatar-large {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 800;
  color: #fff;
}

.avatar-large.guest {
  background: var(--bg-base);
  border: 1px solid var(--border-light);
  color: var(--text-muted);
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
  margin-bottom: 20px;
}

.logout-btn {
  width: 100%;
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
