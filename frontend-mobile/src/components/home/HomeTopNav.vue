<template>
  <header
    class="home-top-nav"
    :class="{ hidden: collapsed }"
    :style="themeStyle"
  >
    <div class="nav-bg" />
    <div class="nav-glow" />
    <div class="nav-inner" :style="innerStyle">
      <div class="brand-row">
        <h1 class="brand-title">{{ theme.brandTitle }}</h1>
        <button type="button" class="avatar-btn" aria-label="我的" @click="$emit('avatar')">
          <span class="avatar-ring">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2h19.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          </span>
        </button>
      </div>
      <p v-if="theme.brandSubtitle" class="brand-sub">{{ theme.brandSubtitle }}</p>
      <div class="search-box" @click="$emit('search')">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7"/>
          <path d="M20 20l-3.5-3.5" stroke-linecap="round"/>
        </svg>
        <span class="search-placeholder">搜索剧名、演员</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { homeTheme } from '@/config/homeTheme';

const props = defineProps({
  scrollY: { type: Number, default: 0 },
  theme: { type: Object, default: () => homeTheme },
});

defineEmits(['avatar', 'search']);

const collapseStart = 24;
const collapseEnd = 120;

const progress = computed(() => {
  const y = props.scrollY;
  if (y <= collapseStart) return 0;
  if (y >= collapseEnd) return 1;
  return (y - collapseStart) / (collapseEnd - collapseStart);
});

const collapsed = computed(() => progress.value >= 0.98);

const innerStyle = computed(() => ({
  opacity: 1 - progress.value * 0.92,
  transform: `translateY(${-progress.value * 28}px)`,
}));

const themeStyle = computed(() => ({
  '--home-nav-gradient': props.theme.navBackgroundGradient,
  '--home-nav-bg-image': props.theme.navBackgroundImage
    ? `url(${props.theme.navBackgroundImage})`
    : 'none',
  '--home-nav-glow': props.theme.navAccentGlow,
  '--home-nav-height': props.theme.navHeight,
  opacity: 1 - progress.value * 0.35,
}));
</script>

<style scoped>
.home-top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  height: calc(var(--home-nav-height) + var(--safe-top));
  padding-top: var(--safe-top);
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.home-top-nav.hidden {
  opacity: 0;
}

.nav-bg {
  position: absolute;
  inset: 0;
  background: var(--home-nav-gradient);
  background-image: var(--home-nav-bg-image), var(--home-nav-gradient);
  background-size: cover;
  background-position: center top;
}

.nav-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 40%, var(--bg-base) 100%);
}

.nav-glow {
  position: absolute;
  top: -20px;
  right: -10px;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, var(--home-nav-glow) 0%, transparent 70%);
  pointer-events: none;
}

.nav-inner {
  position: relative;
  z-index: 1;
  padding: 10px 16px 14px;
  pointer-events: auto;
  will-change: transform, opacity;
}

.brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.brand-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.4px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.avatar-btn {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
}

.avatar-ring {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
}

.avatar-ring svg {
  width: 20px;
  height: 20px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 14px;
  border-radius: 21px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  cursor: pointer;
}

.search-icon {
  width: 18px;
  height: 18px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-placeholder {
  font-size: 14px;
  color: var(--text-muted);
}
</style>
