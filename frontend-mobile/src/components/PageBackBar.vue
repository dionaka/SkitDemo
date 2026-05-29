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
  gap: 8px;
  min-height: 44px;
  padding: 10px 14px 10px 6px;
  margin: 0 0 10px;
  border: none;
  background: transparent;
  color: #e94560;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 10px;
  -webkit-tap-highlight-color: transparent;
}

.page-back:active {
  background: rgba(233, 69, 96, 0.12);
}

.page-back-icon {
  font-size: 20px;
  line-height: 1;
}

.page-back-label {
  line-height: 1.2;
}
</style>
