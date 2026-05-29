<template>
  <div class="app-layout" :class="{ 'chrome-hidden': hideChrome }">
    <main class="app-main" :class="{ 'play-main': hideChrome, 'home-layout': isHomeLayout }">
      <router-view />
    </main>

    <nav v-if="!hideChrome" class="tab-bar">
      <router-link to="/" class="tab-item" :class="{ active: isHome }">
        <span class="tab-icon">🏠</span>
        <span class="tab-label">首页</span>
      </router-link>
      <router-link to="/settings" class="tab-item" :class="{ active: isSettings }">
        <span class="tab-icon">⚙️</span>
        <span class="tab-label">设置</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const hideChrome = computed(() => Boolean(route.meta.hideChrome));
const isHomeLayout = computed(() => Boolean(route.meta.homeLayout));
const isHome = computed(() => route.path === '/');
const isSettings = computed(() => route.path === '/settings');
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
}

.app-layout.chrome-hidden {
  background: #000;
}

.app-main {
  flex: 1;
  padding: calc(16px + var(--safe-top)) 16px calc(var(--tab-height) + 16px + var(--safe-bottom));
  overflow-y: auto;
}

.app-main.play-main {
  padding: var(--safe-top) 0 var(--safe-bottom);
}

.app-main.home-layout {
  padding: 0 16px calc(var(--tab-height) + 16px + var(--safe-bottom));
}

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(var(--tab-height) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  display: flex;
  background: rgba(12, 12, 20, 0.92);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--border);
  z-index: 100;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 500;
  transition: color 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.tab-item.active {
  color: var(--accent);
}

.tab-icon {
  font-size: 22px;
  line-height: 1;
}

.tab-label {
  letter-spacing: 0.3px;
}
</style>
