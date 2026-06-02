<template>
  <div
    v-if="visible"
    class="skin-refresh"
    :style="{ transform: `translateY(${offset}px)` }"
  >
    <div class="skin-refresh-inner" :class="{ spinning: isRefreshing }">
      <img
        v-if="iconUrl"
        :src="iconUrl"
        alt=""
        class="skin-refresh-icon"
      />
      <div v-else class="skin-refresh-dot" />
    </div>
    <span class="skin-refresh-text">{{ statusText }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useSkinStore } from '../store/skinStore';

const props = defineProps({
  pullDistance: { type: Number, default: 0 },
  isPulling: { type: Boolean, default: false },
  isRefreshing: { type: Boolean, default: false },
});

const skin = useSkinStore();

const visible = computed(() => skin.isActive && (props.isPulling || props.isRefreshing || props.pullDistance > 4));

const offset = computed(() => {
  if (props.isRefreshing) return 56;
  return Math.min(72, props.pullDistance);
});

const iconUrl = computed(() => skin.refreshTheme?.icon || skin.tabBarTheme?.tabs?.[0]?.iconActive || '');

const statusText = computed(() => {
  if (props.isRefreshing) return '刷新中';
  if (props.pullDistance >= 72) return '松开刷新';
  if (props.isPulling) return '下拉刷新';
  return '';
});
</script>

<style scoped>
.skin-refresh {
  position: fixed;
  top: calc(var(--safe-top) + 8px);
  left: 0;
  right: 0;
  z-index: 80;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
  transition: transform 0.22s ease;
}

.skin-refresh-inner {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.skin-refresh-inner.spinning {
  animation: skin-refresh-spin 0.8s linear infinite;
}

.skin-refresh-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.skin-refresh-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--skin-accent, var(--accent));
}

.skin-refresh-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.72);
}

@keyframes skin-refresh-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
