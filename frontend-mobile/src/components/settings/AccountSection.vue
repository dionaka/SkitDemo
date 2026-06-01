<template>
  <SettingsSection
    title="账号登录"
    description="登录后同步观看进度"
  >
    <div v-if="session.isLoggedIn" class="card account-card">
      <div class="account-row">
        <UserAvatar
          :username="session.username"
          :avatar-url="session.avatarUrl"
          size="md"
        />
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
import { useRouter } from 'vue-router';
import SettingsSection from './SettingsSection.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import { useSessionStore } from '@/stores/session';

const router = useRouter();
const session = useSessionStore();
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
