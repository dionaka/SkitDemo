<template>
  <nav class="skin-tab-bar" :style="barStyle">
    <div v-if="bgImage" class="skin-tab-bg" :style="{ backgroundImage: `url(${bgImage})` }" />

    <router-link
      v-for="tab in tabs"
      :key="tab.id"
      :to="tab.to"
      class="skin-tab-item"
      :class="{ active: tab.active, bounce: bounceId === tab.id }"
      :style="itemStyle(tab.active)"
      @click="onTabClick(tab)"
    >
      <span class="skin-tab-icon-wrap">
        <img
          v-if="tab.iconSrc"
          :src="tab.iconSrc"
          :alt="tab.label"
          class="skin-tab-icon-img"
        />
        <span v-else class="skin-tab-icon-fallback">{{ tab.fallbackIcon }}</span>
      </span>
      <span class="skin-tab-label">{{ tab.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSkinStore } from '../store/skinStore';

const route = useRoute();
const skin = useSkinStore();
const bounceId = ref('');

const fallbackTabs = [
  { id: 'home', to: '/', label: '首页', fallbackIcon: '🏠' },
  { id: 'settings', to: '/settings', label: '设置', fallbackIcon: '⚙️' },
];

const tabBar = computed(() => skin.tabBarTheme);

const bgImage = computed(() => tabBar.value?.backgroundImage || '');

const barStyle = computed(() => ({
  '--skin-tab-inactive': tabBar.value?.inactiveColor || 'var(--text-muted)',
  '--skin-tab-active': tabBar.value?.activeColor || 'var(--accent)',
}));

const tabs = computed(() => {
  const configured = tabBar.value?.tabs || [];
  return fallbackTabs.map((fallback) => {
    const match = configured.find((item) => item.id === fallback.id);
    const active = fallback.id === 'home'
      ? route.path === '/'
      : route.path === '/settings';
    const iconSrc = active
      ? (match?.iconActive || match?.icon || '')
      : (match?.icon || match?.iconActive || '');
    return {
      ...fallback,
      iconSrc,
      fallbackIcon: match?.fallbackIcon || fallback.fallbackIcon,
      active,
      animate: tabBar.value?.animateIcons,
    };
  });
});

function itemStyle(active) {
  return { color: active ? 'var(--skin-tab-active)' : 'var(--skin-tab-inactive)' };
}

function onTabClick(tab) {
  if (!tabBar.value?.animateIcons) return;

  const isHomeRefresh = tab.id === 'home' && route.path === '/';
  if (isHomeRefresh) {
    skin.triggerHomeRefresh();
  }

  bounceId.value = tab.id;
  setTimeout(() => {
    if (bounceId.value === tab.id) bounceId.value = '';
  }, 520);
}

watch(() => skin.refreshToken, () => {
  if (!tabBar.value?.animateIcons) return;
  bounceId.value = 'home';
  setTimeout(() => {
    if (bounceId.value === 'home') bounceId.value = '';
  }, 520);
});
</script>

<style scoped>
.skin-tab-bar {
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
  overflow: hidden;
}

.skin-tab-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center bottom;
  opacity: 0.95;
  pointer-events: none;
}

.skin-tab-item {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 500;
  transition: color 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.skin-tab-icon-wrap {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skin-tab-icon-img {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.skin-tab-icon-fallback {
  font-size: 22px;
  line-height: 1;
}

.skin-tab-label {
  letter-spacing: 0.3px;
}

.skin-tab-item.bounce .skin-tab-icon-wrap {
  animation: skin-tab-bounce 0.52s ease;
}

@keyframes skin-tab-bounce {
  0% { transform: scale(1); }
  35% { transform: scale(1.18) translateY(-3px); }
  70% { transform: scale(0.94); }
  100% { transform: scale(1); }
}

:global(html.skin-active) .skin-tab-bar {
  background: rgba(8, 8, 14, 0.72);
}
</style>
