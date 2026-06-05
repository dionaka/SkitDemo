<template>
  <Transition name="panel-pop">
    <div v-if="visible" class="interaction-panel">
      <div class="panel-header">
        <div class="panel-header-left">
          <div class="title-row">
            <span class="tag" :style="{ background: getCategoryColor(highlight?.category) }">{{ categoryLabel }}</span>
            <h3>{{ highlight?.title }}</h3>
          </div>
        </div>
        <button type="button" class="close-btn" aria-label="关闭" @click="$emit('dismiss')">×</button>
      </div>

      <div class="flip-wrap">
        <div class="flip" :class="{ flipped: mode === 'result' }">
          <div class="face face-front">
            <div class="options">
              <button
                v-for="opt in highlight?.options"
                :key="opt"
                class="option-btn"
                :disabled="selected"
                @click="$emit('select', opt)"
              >
                <span class="option-text">{{ opt }}</span>
                <span class="option-pct option-pct--placeholder">00%</span>
              </button>
            </div>
          </div>

          <div class="face face-back">
            <div class="options">
              <button
                v-for="opt in highlight?.options"
                :key="opt"
                class="option-btn option-btn--result"
                disabled
                :style="{ '--pct': percentageFor(opt) }"
              >
                <span class="option-text">{{ opt }}</span>
                <span class="option-pct">{{ percentageFor(opt) }}%</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue';
import { getCategoryLabel, getCategoryColor } from '@/config/highlightCategories';

const props = defineProps({
  visible: Boolean,
  highlight: Object,
  stats: Object,
  selected: Boolean,
  mode: { type: String, default: 'options' },
});

defineEmits(['select', 'dismiss']);

const categoryLabel = computed(() => getCategoryLabel(props.highlight?.category));

const percentageMap = computed(() => {
  const m = new Map();
  (props.stats?.options || []).forEach((s) => {
    if (typeof s?.option === 'string') m.set(s.option, Number(s.percentage || 0));
  });
  return m;
});

function percentageFor(option) {
  const v = percentageMap.value.get(option);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
}
</script>

<style scoped>
.interaction-panel {
  background: rgba(18, 18, 28, 0.96);
  color: #fff;
  padding: 10px 10px 12px;
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  max-height: 100%;
  overflow: hidden;
  width: clamp(200px, 28vw, 300px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-header {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}

.panel-header-left { min-width: 0; flex: 1; }

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.close-btn {
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
}

.close-btn:hover { background: rgba(255, 255, 255, 0.16); }

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
}

.panel-header h3 {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flip-wrap {
  perspective: 900px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.flip {
  display: grid;
  transform-style: preserve-3d;
  transition: transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);
  width: 100%;
}

.flip.flipped { transform: rotateY(180deg); }

.face {
  grid-area: 1 / 1;
  backface-visibility: hidden;
  min-height: 0;
  display: flex;
  width: 100%;
}

.face-back { transform: rotateY(180deg); }

.options {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.option-btn {
  padding: 10px 8px;
  border: 1.5px solid rgba(233, 69, 96, 0.5);
  border-radius: 12px;
  background: rgba(233, 69, 96, 0.08);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px;
  align-items: center;
  position: relative;
  overflow: hidden;
  min-height: 40px;
}

.option-btn:hover:not(:disabled) {
  background: #e94560;
  border-color: #e94560;
}

.option-btn:disabled { opacity: 0.45; cursor: default; }

.option-text {
  position: relative;
  z-index: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-pct {
  position: relative;
  z-index: 1;
  text-align: right;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.75);
}

.option-pct--placeholder { opacity: 0; }

.option-btn--result {
  opacity: 1;
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
}

.option-btn--result::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: calc(var(--pct) * 1%);
  background: rgba(233, 69, 96, 0.26);
}

.panel-pop-enter-active,
.panel-pop-leave-active {
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.panel-pop-enter-from,
.panel-pop-leave-to {
  transform: translateX(12px) scale(0.98);
  opacity: 0;
}
</style>
