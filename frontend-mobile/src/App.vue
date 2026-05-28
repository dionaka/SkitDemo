<template>
  <div class="app-layout">
    <header class="app-header">
      <router-link to="/" class="logo">🎬 短剧互动</router-link>
      <router-link to="/settings" class="settings-btn" aria-label="设置">⚙</router-link>
    </header>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0f0f1a;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  height: 52px;
  padding-top: env(safe-area-inset-top);
  background: #1a1a2e;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 50;
}

.logo {
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  text-decoration: none;
}

.settings-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #ccc;
  text-decoration: none;
  border-radius: 8px;
}

.settings-btn.router-link-active {
  color: #e94560;
}

.app-main {
  flex: 1;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}
</style>
