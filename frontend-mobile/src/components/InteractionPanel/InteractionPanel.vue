<template>
  <Transition name="slide-up">
    <div v-if="visible" class="interaction-panel">
      <div class="panel-header">
        <span class="tag" :class="highlight?.category">{{ categoryLabel }}</span>
        <h3>{{ highlight?.title }}</h3>
      </div>

      <div class="options">
        <button
          v-for="opt in highlight?.options"
          :key="opt"
          class="option-btn"
          :disabled="selected"
          @click="$emit('select', opt)"
        >
          {{ opt }}
        </button>
      </div>

      <div v-if="stats" class="stats">
        <p class="stats-title">其他用户的选择</p>
        <div v-for="s in stats.options" :key="s.option" class="stat-row">
          <span class="opt-label">{{ s.option }}</span>
          <div class="stat-bar-wrap">
            <div class="stat-bar" :style="{ width: s.percentage + '%' }" />
          </div>
          <span class="pct">{{ s.percentage }}%</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  visible: Boolean,
  highlight: Object,
  stats: Object,
  selected: Boolean,
});

defineEmits(['select']);

const labels = { conflict: '冲突', reversal: '反转', sweet: '撒糖', scene: '名场面' };
const categoryLabel = computed(() => labels[props.highlight?.category] || '高光');
</script>

<style scoped>
.interaction-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(26, 26, 46, 0.97);
  color: #fff;
  padding: 20px 16px calc(24px + env(safe-area-inset-bottom));
  z-index: 100;
  backdrop-filter: blur(10px);
  max-height: 70vh;
  overflow-y: auto;
}

.panel-header {
  margin-bottom: 14px;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  margin-bottom: 8px;
}

.tag.conflict { background: #ff4757; }
.tag.reversal { background: #ffa502; }
.tag.sweet { background: #ff6b81; }
.tag.scene { background: #5352ed; }

.panel-header h3 {
  font-size: 17px;
  line-height: 1.4;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-btn {
  padding: 14px 20px;
  border: 2px solid #e94560;
  border-radius: 12px;
  background: transparent;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
  text-align: center;
}

.option-btn:active:not(:disabled) {
  background: #e94560;
}

.option-btn:disabled {
  opacity: 0.5;
}

.stats {
  margin-top: 16px;
}

.stats-title {
  font-size: 13px;
  color: #aaa;
  margin-bottom: 8px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.opt-label {
  width: 72px;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-bar-wrap {
  flex: 1;
  height: 6px;
  background: #333;
  border-radius: 3px;
}

.stat-bar {
  height: 100%;
  background: #e94560;
  border-radius: 3px;
  transition: width 0.5s;
}

.pct {
  width: 36px;
  text-align: right;
  color: #aaa;
  font-size: 12px;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
