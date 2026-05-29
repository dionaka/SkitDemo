<template>
  <button type="button" class="page-back" @click="$emit('back')">
    <span class="page-back-icon" aria-hidden="true">←</span>
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
  gap: 6px;
  padding: 8px 12px 8px 4px;
  margin: 0 0 12px;
  border: none;
  background: transparent;
  color: #e94560;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
}

.page-back:hover {
  background: rgba(233, 69, 96, 0.08);
}

.page-back:active {
  background: rgba(233, 69, 96, 0.14);
}

.page-back-icon {
  font-size: 18px;
  line-height: 1;
}

.page-back-label {
  line-height: 1.2;
}
</style>
