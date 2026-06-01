<template>
  <div class="user-avatar" :class="[`size-${size}`, { clickable }]" :style="rootStyle">
    <img v-if="resolvedUrl" :src="resolvedUrl" :alt="alt" class="avatar-img" />
    <span v-else class="avatar-letter">{{ letter }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { resolveMediaUrl } from '@/config/server';

const props = defineProps({
  username: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  size: { type: String, default: 'md' },
  clickable: { type: Boolean, default: false },
  alt: { type: String, default: '用户头像' },
});

const resolvedUrl = computed(() => resolveMediaUrl(props.avatarUrl));
const letter = computed(() => {
  const name = props.username || '';
  return name.slice(0, 1).toUpperCase() || '?';
});

const sizeMap = {
  sm: '32px',
  md: '44px',
  lg: '72px',
};

const rootStyle = computed(() => ({
  width: sizeMap[props.size] || sizeMap.md,
  height: sizeMap[props.size] || sizeMap.md,
}));
</script>

<style scoped>
.user-avatar {
  border-radius: 50%;
  overflow: hidden;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-avatar.size-sm {
  font-size: 14px;
}

.user-avatar.size-md {
  font-size: 18px;
}

.user-avatar.size-lg {
  font-size: 28px;
}

.user-avatar.clickable {
  cursor: pointer;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-letter {
  font-weight: 800;
  color: #fff;
}
</style>
