<template>
  <div class="login-page">
    <div class="box">
      <div class="left"></div>
      <div class="right">
        <h2>欢迎登录喵</h2>
        <p></p>
        <p></p>
        <form id="loginForm" @submit.prevent="handleLogin">
          <br /><br /><br />
          <input
            v-model="form.username"
            class="acc"
            type="text"
            placeholder="用户名/邮箱登录"
            required
          />
          <br /><br /><br />
          <input
            v-model="form.password"
            class="acc"
            type="password"
            placeholder="密码"
            required
          />
          <br /><br /><br />
          <div v-show="errorMsg" class="error-message">{{ errorMsg }}</div>
          <br /><br /><br />
          <input
            id="登录"
            type="submit"
            :value="loading ? '登录中...' : '登录'"
            :disabled="loading"
          />
          <br /><br /><br />
        </form>
        <div class="fn">
          <span class="hint">默认账号: admin / admin123</span>
        </div>
      </div>
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
const errorMsg = ref('');
const form = ref({ username: 'admin', password: 'admin123' });

async function handleLogin() {
  errorMsg.value = '';
  const username = form.value.username.trim();
  const password = form.value.password;

  if (!username || !password) {
    errorMsg.value = '用户名和密码不能为空';
    return;
  }

  loading.value = true;
  try {
    const data = await adminLogin(
      { username, password },
      { silent: true }
    );
    session.setAdmin(data.token, data.username);
    router.push('/admin/videos');
  } catch (err) {
    errorMsg.value = err.message || '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* 布局对齐原站；窄屏通过 rem 根字号等比缩小，保持左右分栏比例不变 */
.login-page {
  min-height: 100vh;
  position: relative;
  /* 90rem 卡片宽 = 90 × 根字号；窄屏根字号缩小使整卡 fit 屏宽，避免手机默认放大到左上角 */
  font-size: min(10px, calc((100vw - 2rem) / 90));
  box-sizing: border-box;
  overflow-x: hidden;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

.login-page::before {
  content: '';
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: -1;
  background: linear-gradient(45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab),
    url('/login-assets/3.gif');
  background-blend-mode: multiply;
}

.box {
  display: flex;
  overflow: hidden;
  width: 90rem;
  height: 50rem;
  background-color: rgba(255, 255, 255, 60%);
  border-radius: 1.5rem;
  margin: 10% auto;
  box-shadow: 0 0 1rem 0.2rem rgb(0 0 0 / 10%);
}

.box .left {
  position: relative;
  width: 35%;
  height: 100%;
  background-color: skyblue;
}

.box .left::before {
  content: '';
  width: 100%;
  height: 100%;
  position: absolute;
  background-image: url('/login-assets/1.jpg');
  background-size: cover;
  opacity: 100%;
}

.box .right {
  display: flex;
  width: 65%;
  flex-direction: column;
  align-items: center;
}

.box .right h2 {
  color: black;
  font-family: 仿宋, FangSong, serif;
  font-weight: 300;
  font-size: 3.5rem;
  margin-top: 5rem;
}

.acc {
  font-size: 3.5rem;
  font-weight: 400;
  font-family: 楷体, KaiTi, serif;
  color: #333;
  background: #fff;
  border: 1px solid #000;
  box-sizing: border-box;
  outline: none;
}

.acc::placeholder {
  color: #999;
  font-family: 楷体, KaiTi, serif;
  font-weight: 200;
}

.acc:focus {
  background: #fff;
  border: 2px solid #000;
}

#登录 {
  width: 37.8rem;
  height: 4.2rem;
  background: #ffc028;
  border: 2px dashed pink;
  color: white;
  font-size: 2.5em;
  cursor: pointer;
}

#登录:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  color: #e74c3c;
  font-size: 1.4rem;
  margin-top: 0.5rem;
}

.fn {
  font-size: 1.3rem;
}

.fn .hint {
  color: #666;
}
</style>
