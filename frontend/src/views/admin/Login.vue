<template>
  <div class="login-page">
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
/* 与原站 index.css 一致：html font-size 为 10px，rem 才等于设计稿尺寸 */
.login-page {
  min-height: 100vh;
  position: relative;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

/* 整体缩放到约 62%，避免占满屏幕 */
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
  border-radius: 0;
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

#登录 {
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

#登录.after-error {
  margin-top: 0;
}

#登录:disabled {
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

@media (max-width: 768px) {
  .login-page {
    font-size: 8px;
    padding: 1rem;
  }

  .box-wrap {
    width: calc(90vw / 0.62);
    max-width: 55.8rem;
    height: auto;
  }

  .box-wrap .box {
    transform: scale(0.62);
    width: 90rem;
    max-width: none;
  }

  .box {
    flex-direction: column;
    height: auto;
  }

  .box .left {
    width: 100%;
    height: 18rem;
  }

  .box .right {
    width: 100%;
    padding-bottom: 3rem;
  }

  .box .right h2 {
    font-size: 3rem;
    margin-top: 2rem;
  }

  .acc {
    font-size: 3rem;
    line-height: calc(4.2rem - 2px);
  }
}
</style>
