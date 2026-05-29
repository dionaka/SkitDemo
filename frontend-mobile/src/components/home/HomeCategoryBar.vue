<template>
  <div class="home-category-wrap" :class="{ pinned: pinned }">
    <div class="home-category-bar">
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        class="category-chip"
        :class="{ active: modelValue === cat.id }"
        @click="$emit('update:modelValue', cat.id)"
      >
        {{ cat.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { homeCategories } from '@/config/homeTheme';

defineProps({
  modelValue: { type: String, default: 'hot' },
  pinned: { type: Boolean, default: false },
  categories: { type: Array, default: () => homeCategories },
});

defineEmits(['update:modelValue']);
</script>

<style scoped>
.home-category-wrap {
  position: sticky;
  top: 0;
  z-index: 50;
  margin: 0 -16px 16px;
  padding: 8px 16px 12px;
  transition: background 0.2s, box-shadow 0.2s, padding 0.2s;
}

.home-category-wrap.pinned {
  padding-top: calc(8px + var(--safe-top));
  background: rgba(7, 7, 13, 0.92);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.home-category-bar {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scrollbar-width: none;
}

.home-category-bar::-webkit-scrollbar {
  display: none;
}

.category-chip {
  flex-shrink: 0;
  border: none;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, transform 0.15s;
}

.category-chip.active {
  color: #fff;
  background: var(--accent-gradient);
  box-shadow: 0 4px 14px rgba(255, 77, 109, 0.35);
}

.category-chip:active {
  transform: scale(0.96);
}
</style>
