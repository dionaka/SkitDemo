<template>
  <Transition name="slide-up">
    <div v-if="visible" class="interaction-panel">
      <div class="panel-handle" />
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
        <p class="stats-title">其他观众的选择</p>
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
  background: rgba(18, 18, 28, 0.96);
  color: #fff;
  padding: 8px 20px calc(28px + env(safe-area-inset-bottom));
  z-index: 200;
  backdrop-filter: blur(24px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px 20px 0 0;
  max-height: 72vh;
  overflow-y: auto;
}

.panel-handle {
  width: 36px;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  margin: 0 auto 16px;
}

.panel-header { margin-bottom: 16px; }

.tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 8px;
}

.tag.conflict { background: rgba(255, 71, 87, 0.85); }
.tag.reversal { background: rgba(255, 165, 2, 0.85); }
.tag.sweet { background: rgba(255, 107, 129, 0.85); }
.tag.scene { background: rgba(83, 82, 237, 0.85); }

.panel-header h3 {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: -0.2px;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-btn {
  padding: 15px 20px;
  border: 1.5px solid rgba(255, 77, 109, 0.5);
  border-radius: 14px;
  background: rgba(255, 77, 109, 0.08);
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.option-btn:active:not(:disabled) {
  background: var(--accent);
  border-color: var(--accent);
  transform: scale(0.98);
}

.option-btn:disabled { opacity: 0.45; }

.stats {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.stats-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 10px;
  font-weight: 500;
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
  color: rgba(255, 255, 255, 0.8);
}

.stat-bar-wrap {
  flex: 1;
  height: 5px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
}

.stat-bar {
  height: 100%;
  background: var(--accent-gradient);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.pct {
  width: 36px;
  text-align: right;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
