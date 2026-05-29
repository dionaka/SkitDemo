<template>
  <button type="button" class="page-back" @click="$emit('back')">
    <svg class="back-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="page-back-label">{{ label }}</span>
  </button>
</template>

<script setup>
defineProps({
  label: { type: String, default: '返回' },
});

defineEmits(['back']);
</script>

<style scoped>
.page-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  padding: 8px 14px 8px 10px;
  margin: 0 0 14px;
  border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 20px;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
}

.page-back:active {
  background: rgba(255, 255, 255, 0.12);
}

.back-svg {
  width: 18px;
  height: 18px;
  color: var(--accent);
}

.page-back-label {
  line-height: 1.2;
}
</style>
