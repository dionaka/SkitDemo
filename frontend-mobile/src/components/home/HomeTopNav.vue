<template>
  <header
    class="home-top-nav"
    :class="{ collapsed: collapsed, 'has-skin-bg': hasSkinBg }"
    :style="themeVars"
  >
    <div class="nav-bg" />
    <div class="nav-mesh" />
    <div class="nav-glow" />
    <div class="nav-inner" :style="innerStyle">
      <div class="toolbar-row">
        <div class="search-box" role="button" tabindex="0" @click="$emit('search')">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" stroke-linecap="round" />
          </svg>
          <span class="search-placeholder">搜索剧名、分集</span>
        </div>
        <button type="button" class="avatar-btn" aria-label="个人中心" @click="$emit('profile')">
          <UserAvatar
            v-if="loggedIn"
            :username="username"
            :avatar-url="avatarUrl"
            size="sm"
          />
          <span v-else class="avatar-ring">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2h19.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { homeTheme } from '@/config/homeTheme';
import UserAvatar from '@/components/UserAvatar.vue';
import { useSessionStore } from '@/stores/session';

const props = defineProps({
  scrollY: { type: Number, default: 0 },
  theme: { type: Object, default: () => homeTheme },
  hasSkinBg: { type: Boolean, default: false },
});

defineEmits(['profile', 'search']);

const session = useSessionStore();
const loggedIn = computed(() => session.isLoggedIn);
const username = computed(() => session.username);
const avatarUrl = computed(() => session.avatarUrl);

const collapseStart = 16;
const collapseEnd = 100;

const progress = computed(() => {
  const y = props.scrollY;
  if (y <= collapseStart) return 0;
  if (y >= collapseEnd) return 1;
  return (y - collapseStart) / (collapseEnd - collapseStart);
});

const collapsed = computed(() => progress.value >= 0.98);

const innerStyle = computed(() => ({
  opacity: 1 - progress.value * 0.95,
  transform: `translateY(${-progress.value * 20}px)`,
}));

const themeVars = computed(() => ({
  '--home-nav-gradient': props.theme.navBackgroundGradient || homeTheme.navBackgroundGradient,
  '--home-nav-bg-image': props.theme.navBackgroundImage
    ? `url(${props.theme.navBackgroundImage})`
    : 'none',
  '--home-nav-glow': props.theme.navAccentGlow || homeTheme.navAccentGlow,
  '--home-nav-mesh': props.theme.navMeshColor || homeTheme.navMeshColor || 'rgba(255, 120, 150, 0.1)',
  '--home-nav-height': props.theme.navHeight,
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
  overflow: hidden;
}

.home-top-nav.collapsed .nav-inner {
  pointer-events: none;
}

.nav-bg {
  position: absolute;
  inset: 0;
  background-color: #1a1028;
  background-image: var(--home-nav-bg-image), var(--home-nav-gradient);
  background-size: cover;
  background-position: center top;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
}

.nav-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.06) 0%,
    transparent 35%,
    rgba(7, 7, 13, 0.15) 75%,
    var(--bg-base) 100%
  );
}

.home-top-nav.has-skin-bg .nav-bg {
  background-size: cover, cover;
  background-position: center top, center top;
}

.home-top-nav.has-skin-bg .nav-bg::after {
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.03) 0%,
    transparent 42%,
    rgba(7, 7, 13, 0.06) 78%,
    rgba(7, 7, 13, 0.35) 100%
  );
}

.home-top-nav.has-skin-bg .nav-mesh {
  opacity: 0.45;
}

.nav-mesh {
  position: absolute;
  inset: 0;
  opacity: 0.9;
  background-image:
    radial-gradient(circle at 18% 30%, var(--home-nav-mesh) 0%, transparent 42%),
    radial-gradient(circle at 82% 18%, rgba(120, 90, 255, 0.18) 0%, transparent 40%),
    linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.04) 48%, transparent 100%);
  pointer-events: none;
}

.nav-glow {
  position: absolute;
  top: -30px;
  right: 20px;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, var(--home-nav-glow) 0%, transparent 68%);
  pointer-events: none;
}

.nav-inner {
  position: relative;
  z-index: 1;
  padding: 12px 16px 14px;
  pointer-events: auto;
  will-change: transform, opacity;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 14px;
  border-radius: 21px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(14px);
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.search-icon {
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.55);
  flex-shrink: 0;
}

.search-placeholder {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.avatar-btn {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
}

.avatar-ring {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.25);
  border: 1.5px solid rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

.avatar-ring svg {
  width: 22px;
  height: 22px;
}
</style>
