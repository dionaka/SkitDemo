<template>
  <div class="login-page">
    <div class="login-card">
      <h2>管理后台登录</h2>
      <el-form @submit.prevent="handleLogin">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="admin" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="admin123" show-password />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading" style="width:100%">
          登录
        </el-button>
      </el-form>
      <p class="hint">默认账号: admin / admin123</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { adminLogin } from '@/api/admin';
import { useSessionStore } from '@/stores/session';

const router = useRouter();
const session = useSessionStore();
const loading = ref(false);
const form = ref({ username: 'admin', password: 'admin123' });

async function handleLogin() {
  loading.value = true;
  try {
    const data = await adminLogin(form.value);
    session.setAdmin(data.token, data.username);
    router.push('/admin/videos');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page { display: flex; justify-content: center; align-items: center; min-height: 60vh; }
.login-card {
  background: #fff; padding: 40px; border-radius: 16px;
  width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}
.login-card h2 { text-align: center; margin-bottom: 24px; }
.hint { text-align: center; color: #999; font-size: 13px; margin-top: 16px; }
</style>
