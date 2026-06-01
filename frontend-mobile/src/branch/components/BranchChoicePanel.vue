<template>
  <Transition name="branch-panel">
    <div v-if="visible" class="branch-choice-panel" @click.self="$emit('dismiss')">
      <div class="panel-sheet">
        <div class="sheet-handle" />
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
          </button>
        </div>

        <div v-if="stats?.choices?.length" class="stats-block">
          <div class="stats-title">他人选择</div>
          <div v-for="item in stats.choices" :key="item.id" class="stat-row">
            <span>{{ item.option_label }}</span>
            <div class="stat-bar-wrap"><div class="stat-bar" :style="{ width: item.percentage + '%' }" /></div>
            <span>{{ item.percentage }}%</span>
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

defineEmits(['select', 'dismiss']);
</script>

<style scoped>
.branch-choice-panel {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
}
.panel-sheet {
  width: 100%;
  background: #1c1c1e;
  border-radius: 20px 20px 0 0;
  padding: 12px 20px calc(20px + var(--safe-bottom));
  color: #fff;
  max-height: 70vh;
  overflow-y: auto;
}
.sheet-handle {
  width: 36px;
  height: 4px;
  background: #444;
  border-radius: 2px;
  margin: 0 auto 16px;
}
.panel-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  color: #e94560;
  background: rgba(233, 69, 96, 0.15);
  padding: 3px 10px;
  border-radius: 20px;
  margin-bottom: 8px;
}
.panel-header h3 { font-size: 18px; margin-bottom: 6px; }
.panel-sub { color: #aaa; font-size: 13px; margin-bottom: 16px; }
.choice-list { display: flex; flex-direction: column; gap: 10px; }
.choice-btn {
  text-align: left;
  padding: 16px;
  border: 1px solid #333;
  border-radius: 14px;
  background: #2c2c2e;
  color: #fff;
}
.choice-btn:active:not(:disabled) { background: #3a3a3c; }
.choice-btn:disabled { opacity: 0.5; }
.choice-label { display: block; font-weight: 700; font-size: 16px; }
.choice-desc { display: block; font-size: 13px; color: #aaa; margin-top: 4px; }
.stats-block { margin-top: 20px; padding-top: 16px; border-top: 1px solid #333; }
.stats-title { font-size: 12px; color: #888; margin-bottom: 10px; }
.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 8px;
}
.stat-row span:first-child { width: 72px; flex-shrink: 0; }
.stat-bar-wrap { flex: 1; height: 4px; background: #333; border-radius: 2px; overflow: hidden; }
.stat-bar { height: 100%; background: #e94560; }
.branch-panel-enter-active,
.branch-panel-leave-active { transition: opacity 0.25s; }
.branch-panel-enter-from,
.branch-panel-leave-to { opacity: 0; }
</style>
