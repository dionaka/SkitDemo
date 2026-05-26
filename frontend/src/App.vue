<template>
  <div class="app-layout">
    <header class="app-header">
      <router-link to="/" class="logo">🎬 短剧互动平台</router-link>
      <nav>
        <router-link to="/">短剧列表</router-link>
        <router-link to="/admin/login">管理后台</router-link>
      </nav>
    </header>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout { min-height: 100vh; display: flex; flex-direction: column; }
.app-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 24px; height: 56px; background: #1a1a2e; color: #fff;
}
.logo { font-size: 18px; font-weight: 700; color: #fff; text-decoration: none; }
nav { display: flex; gap: 20px; }
nav a { color: #ccc; text-decoration: none; font-size: 14px; }
nav a.router-link-active { color: #e94560; }
.app-main { flex: 1; padding: 24px; background: #f5f5f5; }
</style>
