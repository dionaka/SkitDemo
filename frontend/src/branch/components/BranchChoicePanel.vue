<template>
  <Transition name="branch-panel">
    <div v-if="visible" class="branch-choice-panel">
      <div class="panel-inner">
        <div class="panel-header">
          <span class="panel-tag">剧情分支</span>
          <h3>{{ title }}</h3>
          <p v-if="subtitle" class="panel-sub">{{ subtitle }}</p>
        </div>

        <div class="choice-list">
          <button
            v-for="choice in choices"
            :key="choice.id"
            type="button"
            class="choice-btn"
            :disabled="loading"
            @click="$emit('select', choice)"
          >
            <span class="choice-label">{{ choice.option_label }}</span>
            <span v-if="choice.option_desc" class="choice-desc">{{ choice.option_desc }}</span>
            <span v-if="choice.preview?.caption" class="choice-preview">{{ choice.preview.caption }}</span>
          </button>
        </div>

        <div v-if="stats?.choices?.length" class="stats-block">
          <div class="stats-title">其他用户选择分布</div>
          <div v-for="item in stats.choices" :key="item.id" class="stat-row">
            <span class="stat-label">{{ item.option_label }}</span>
            <div class="stat-bar-wrap">
              <div class="stat-bar" :style="{ width: item.percentage + '%' }" />
            </div>
            <span class="stat-pct">{{ item.percentage }}%</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '你会如何选择？' },
  subtitle: { type: String, default: '' },
  choices: { type: Array, default: () => [] },
  stats: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

defineEmits(['select']);
</script>

<style scoped>
.branch-choice-panel {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  padding: 24px;
}
.panel-inner {
  width: 100%;
  max-width: 560px;
  background: #fff;
  border-radius: 16px 16px 12px 12px;
  padding: 24px;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.2);
}
.panel-header { margin-bottom: 20px; }
.panel-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  color: #e94560;
  background: #ffeef1;
  padding: 3px 10px;
  border-radius: 20px;
  margin-bottom: 8px;
}
.panel-header h3 { font-size: 20px; margin-bottom: 6px; }
.panel-sub { color: #666; font-size: 14px; }
.choice-list { display: flex; flex-direction: column; gap: 10px; }
.choice-btn {
  text-align: left;
  padding: 14px 16px;
  border: 2px solid #eee;
  border-radius: 12px;
  background: #fafafa;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.15s;
}
.choice-btn:hover:not(:disabled) {
  border-color: #e94560;
  transform: translateY(-1px);
}
.choice-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.choice-label { display: block; font-weight: 700; font-size: 16px; color: #222; }
.choice-desc { display: block; font-size: 13px; color: #666; margin-top: 4px; }
.choice-preview { display: block; font-size: 12px; color: #e94560; margin-top: 6px; }
.stats-block {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}
.stats-title { font-size: 13px; color: #888; margin-bottom: 10px; }
.stat-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.stat-label { width: 88px; font-size: 12px; flex-shrink: 0; }
.stat-bar-wrap { flex: 1; height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
.stat-bar { height: 100%; background: #e94560; border-radius: 3px; }
.stat-pct { width: 36px; font-size: 12px; color: #666; text-align: right; }
.branch-panel-enter-active,
.branch-panel-leave-active { transition: opacity 0.25s ease; }
.branch-panel-enter-from,
.branch-panel-leave-to { opacity: 0; }
</style>
