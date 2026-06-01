<template>
  <SettingsSection
    title="账号登录"
    description="登录后同步观看进度"
  >
    <div v-if="session.isLoggedIn" class="card account-card">
      <div class="account-row">
        <div class="account-avatar">{{ avatarLetter }}</div>
        <div class="account-info">
          <div class="account-name">{{ session.username }}</div>
          <div class="account-status">已登录</div>
        </div>
      </div>
      <button type="button" class="btn btn-ghost account-btn" @click="router.push('/profile')">
        账号管理
      </button>
    </div>

    <div v-else class="card account-card">
      <p class="account-hint">登录后可同步观看进度，换设备也能接着看</p>
      <button type="button" class="btn btn-primary account-btn" @click="router.push('/login')">
        登录 / 注册
      </button>
    </div>
  </SettingsSection>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import SettingsSection from './SettingsSection.vue';
import { useSessionStore } from '@/stores/session';

const router = useRouter();
const session = useSessionStore();

const avatarLetter = computed(() => {
  const name = session.username || '';
  return name.slice(0, 1).toUpperCase() || 'U';
});
</script>

<style scoped>
.account-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.account-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.account-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}

.account-name {
  font-size: 16px;
  font-weight: 700;
}

.account-status {
  font-size: 12px;
  color: var(--accent);
  margin-top: 2px;
}

.account-hint {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
}

.account-btn {
  width: 100%;
}
</style>
