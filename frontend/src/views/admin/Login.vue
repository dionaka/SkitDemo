<template>
  <div class="login-page">
    <!-- 桌面端：保持现有 box-wrap + scale(0.62) 布局 -->
    <div class="login-desktop">
      <div class="box-wrap">
        <div class="box">
          <div class="left"></div>
          <div class="right">
            <h2>欢迎登录喵</h2>
            <form id="loginForm" class="login-form" @submit.prevent="handleLogin">
              <input
                v-model="form.username"
                class="acc"
                type="text"
                placeholder="用户名/邮箱登录"
                required
              />
              <input
                v-model="form.password"
                class="acc"
                type="password"
                placeholder="密码"
                required
              />
              <div v-show="errorMsg" class="error-message">{{ errorMsg }}</div>
              <input
                id="登录"
                type="submit"
                class="submit-btn"
                :class="{ 'after-error': errorMsg }"
                :value="loading ? '登录中...' : '登录'"
                :disabled="loading"
              />
            </form>
            <div class="fn">
              <span class="hint">默认账号: admin / admin123</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 手机端：独立竖版布局，无 transform 缩放 -->
    <div class="login-mobile">
      <div class="mobile-card">
        <div class="mobile-banner"></div>
        <div class="mobile-body">
          <h2>欢迎登录喵</h2>
          <form class="mobile-form" @submit.prevent="handleLogin">
            <input
              v-model="form.username"
              class="mobile-acc"
              type="text"
              placeholder="用户名/邮箱登录"
              required
            />
            <input
              v-model="form.password"
              class="mobile-acc"
              type="password"
              placeholder="密码"
              required
            />
            <div v-show="errorMsg" class="mobile-error">{{ errorMsg }}</div>
            <button type="submit" class="mobile-submit" :disabled="loading">
              {{ loading ? '登录中...' : '登录' }}
            </button>
          </form>
          <p class="mobile-hint">默认账号: admin / admin123</p>
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
.login-page {
  min-height: 100vh;
  position: relative;
}

.login-page::before {
  content: '';
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: -1;
  /* 壁纸：将你的图片放到 public/login-assets/bg.jpg（或改下面文件名） */
  background:
    linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.35)),
    url('/login-assets/bg.jpg') center / cover no-repeat;
}

/* ========== 桌面端 ========== */
.login-desktop {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-size: 10px;
  padding: 2rem;
}

.box-wrap {
  width: 55.8rem;
  height: 31rem;
  flex-shrink: 0;
}

.box-wrap .box {
  transform: scale(0.62);
  transform-origin: top left;
  margin: 0;
}

.box {
  display: flex;
  overflow: hidden;
  width: 90rem;
  height: 50rem;
  background-color: rgba(255, 255, 255, 60%);
  border-radius: 1.5rem;
  box-shadow: 0 0 1rem 0.2rem rgb(0 0 0 / 10%);
}

.box .left {
  position: relative;
  width: 35%;
  height: 100%;
  background-color: skyblue;
  flex-shrink: 0;
}

.box .left::before {
  content: '';
  width: 100%;
  height: 100%;
  position: absolute;
  background-image: url('/login-assets/1.jpg');
  background-size: cover;
  background-position: center;
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

.login-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-top: 4rem;
  gap: 3rem;
}

.acc {
  display: block;
  width: 37.8rem;
  max-width: 85%;
  height: 4.2rem;
  padding: 0 1.2rem;
  font-size: 3.5rem;
  font-weight: 400;
  font-family: 楷体, KaiTi, serif;
  line-height: calc(4.2rem - 2px);
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
  line-height: calc(4.2rem - 4px);
  padding: 0 calc(1.2rem - 1px);
}

.submit-btn {
  width: 37.8rem;
  max-width: 85%;
  height: 4.2rem;
  margin-top: 4rem;
  background: #ffc028;
  border: 2px dashed pink;
  color: white;
  font-size: 2.5em;
  cursor: pointer;
  border-radius: 0.2rem;
}

.submit-btn.after-error {
  margin-top: 0;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  color: #e74c3c;
  font-size: 1.4rem;
  margin-top: 0.5rem;
  text-align: center;
}

.fn {
  font-size: 13px;
  margin-top: 1.5rem;
}

.fn .hint {
  color: #666;
}

/* ========== 手机端 ========== */
.login-mobile {
  display: none;
}

@media (max-width: 768px) {
  .login-desktop {
    display: none;
  }

  .login-mobile {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 16px;
    box-sizing: border-box;
  }

  .mobile-card {
    width: 100%;
    max-width: 420px;
    background-color: rgba(255, 255, 255, 0.65);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgb(0 0 0 / 12%);
  }

  .mobile-banner {
    height: 160px;
    background: skyblue url('/login-assets/1.jpg') center / cover no-repeat;
  }

  .mobile-body {
    padding: 24px 20px 28px;
    text-align: center;
  }

  .mobile-body h2 {
    margin: 0 0 20px;
    color: #000;
    font-family: 仿宋, FangSong, serif;
    font-weight: 300;
    font-size: 26px;
  }

  .mobile-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .mobile-acc {
    width: 100%;
    height: 46px;
    padding: 0 12px;
    font-size: 18px;
    font-weight: 400;
    font-family: 楷体, KaiTi, serif;
    color: #333;
    background: #fff;
    border: 1px solid #000;
    box-sizing: border-box;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }

  .mobile-acc::placeholder {
    color: #999;
    font-weight: 200;
  }

  .mobile-acc:focus {
    border: 2px solid #000;
    padding: 0 11px;
  }

  .mobile-error {
    color: #e74c3c;
    font-size: 14px;
    margin: -4px 0 0;
  }

  .mobile-submit {
    width: 100%;
    height: 46px;
    margin-top: 8px;
    background: #ffc028;
    border: 2px dashed pink;
    color: #fff;
    font-size: 22px;
    font-family: 楷体, KaiTi, serif;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }

  .mobile-submit:disabled {
    opacity: 0.7;
  }

  .mobile-hint {
    margin: 16px 0 0;
    font-size: 12px;
    color: #666;
  }
}
</style>
