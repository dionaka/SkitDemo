<template>
  <div class="login-page">
    <PageBackBar label="返回" @back="goBack" />

    <div class="login-hero">
      <h1>{{ mode === 'login' ? '账号登录' : '注册账号' }}</h1>
      <p>{{ mode === 'login' ? '登录后同步观看进度' : '创建账号，多端同步观看记录' }}</p>
    </div>

    <div class="mode-tabs">
      <button type="button" class="mode-tab" :class="{ active: mode === 'login' }" @click="mode = 'login'">
        登录
      </button>
      <button type="button" class="mode-tab" :class="{ active: mode === 'register' }" @click="mode = 'register'">
        注册
      </button>
    </div>

    <form class="login-form card" @submit.prevent="handleSubmit">
      <div class="field">
        <label for="username">用户名</label>
        <input
          id="username"
          v-model="form.username"
          type="text"
          autocomplete="username"
          placeholder="至少 3 个字符"
          required
        />
      </div>
      <div class="field">
        <label for="password">密码</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          placeholder="至少 6 位"
          required
        />
      </div>

      <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>

      <button type="submit" class="btn btn-primary submit-btn" :disabled="loading">
        {{ loading ? '提交中...' : (mode === 'login' ? '登录' : '注册') }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageBackBar from '@/components/PageBackBar.vue';
import { login, register } from '@/api/auth';
import { useSessionStore } from '@/stores/session';
import { smartBack } from '@/utils/navigation';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const mode = ref(route.query.mode === 'register' ? 'register' : 'login');
const loading = ref(false);
const errorMsg = ref('');
const form = ref({ username: '', password: '' });

function goBack() {
  smartBack(router, '/profile');
}

async function handleSubmit() {
  errorMsg.value = '';
  const username = form.value.username.trim();
  const password = form.value.password;

  if (!username || !password) {
    errorMsg.value = '请填写用户名和密码';
    return;
  }

  loading.value = true;
  try {
    const payload = {
      username,
      password,
    };
    if (session.isAnonymousSession) {
      payload.merge_session_id = session.userSessionId;
    }
    const fn = mode.value === 'login' ? login : register;
    const data = await fn(payload);
    session.setUser(data);
    router.replace('/profile');
  } catch (e) {
    errorMsg.value = e.message || '操作失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  padding: calc(12px + var(--safe-top)) 16px calc(24px + var(--safe-bottom));
}

.login-hero {
  margin: 8px 0 24px;
}

.login-hero h1 {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 8px;
}

.login-hero p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.mode-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.mode-tab {
  flex: 1;
  height: 42px;
  border-radius: 12px;
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
}

.mode-tab.active {
  background: var(--accent-soft);
  border-color: rgba(255, 77, 109, 0.35);
  color: var(--accent);
}

.login-form {
  padding: 20px;
}

.error-text {
  color: #ff6b81;
  font-size: 13px;
  margin-bottom: 12px;
}

.submit-btn {
  width: 100%;
  margin-top: 4px;
}
</style>
