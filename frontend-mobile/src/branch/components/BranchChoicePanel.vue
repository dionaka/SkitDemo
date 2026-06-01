<template>
  <Transition name="branch-panel">
    <div v-if="visible" class="branch-choice-panel">
      <div class="panel-header">
        <div class="panel-header-left">
          <span class="panel-tag">剧情分支</span>
          <h3>{{ title }}</h3>
          <p v-if="subtitle" class="panel-sub">{{ subtitle }}</p>
        </div>
        <button type="button" class="close-btn" aria-label="关闭" @click="$emit('dismiss')">×</button>
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
  background: rgba(18, 18, 28, 0.96);
  color: #fff;
  padding: 8px 8px 10px;
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  max-height: 100%;
  overflow-y: auto;
  width: clamp(180px, 46vw, 280px);
  box-sizing: border-box;
}

.panel-header {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}

.panel-header-left { min-width: 0; flex: 1; }

.close-btn {
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
}

.panel-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  color: #e94560;
  background: rgba(233, 69, 96, 0.15);
  padding: 3px 8px;
  border-radius: 20px;
  margin-bottom: 6px;
}

.panel-header h3 { font-size: 12px; margin: 0 0 4px; font-weight: 700; }
.panel-sub { color: #aaa; font-size: 11px; margin: 0; }

.choice-list { display: flex; flex-direction: column; gap: 6px; }

.choice-btn {
  text-align: left;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.choice-btn:active:not(:disabled) { background: rgba(83, 82, 237, 0.25); }
.choice-btn:disabled { opacity: 0.5; }

.choice-label { display: block; font-weight: 700; font-size: 12px; }
.choice-desc { display: block; font-size: 11px; color: #aaa; margin-top: 4px; }

.stats-block { margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.1); }
.stats-title { font-size: 10px; color: #888; margin-bottom: 6px; }
.stat-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  margin-bottom: 6px;
}
.stat-row span:first-child { width: 56px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stat-bar-wrap { flex: 1; height: 4px; background: rgba(255, 255, 255, 0.1); border-radius: 2px; overflow: hidden; }
.stat-bar { height: 100%; background: #5352ed; }

.branch-panel-enter-active,
.branch-panel-leave-active { transition: transform 0.24s ease, opacity 0.24s ease; }
.branch-panel-enter-from,
.branch-panel-leave-to { transform: translateX(10px); opacity: 0; }
</style>
