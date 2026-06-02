<template>
  <div
    v-show="visible"
    class="skin-refresh-inline"
    :class="{ refreshing: isRefreshing }"
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
    <span v-if="statusText" class="skin-refresh-text">{{ statusText }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useSkinStore } from '../store/skinStore';

const props = defineProps({
  pullDistance: { type: Number, default: 0 },
  isPulling: { type: Boolean, default: false },
  isRefreshing: { type: Boolean, default: false },
  pullThreshold: { type: Number, default: 56 },
});

const skin = useSkinStore();

const visible = computed(
  () => props.isPulling || props.isRefreshing || props.pullDistance > 2,
);

const iconUrl = computed(
  () => skin.refreshTheme?.icon || skin.tabBarTheme?.tabs?.[0]?.iconActive || '',
);

const statusText = computed(() => {
  if (props.isRefreshing) return '刷新中';
  if (props.pullDistance >= props.pullThreshold) return '松开刷新';
  if (props.isPulling && props.pullDistance > 8) return '下拉刷新';
  return '';
});
</script>

<style scoped>
.skin-refresh-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  min-height: 52px;
  padding: 4px 0 6px;
  pointer-events: none;
}

.skin-refresh-inner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(12px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
}

.skin-refresh-inner.spinning {
  animation: skin-refresh-spin 0.8s linear infinite;
}

.skin-refresh-icon {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.skin-refresh-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--skin-accent, var(--accent));
}

.skin-refresh-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.78);
  letter-spacing: 0.2px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

@keyframes skin-refresh-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
