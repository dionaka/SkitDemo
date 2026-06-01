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
  padding: 10px 10px 12px;
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  max-height: 100%;
  overflow-y: auto;
  width: clamp(200px, 28vw, 300px);
  box-sizing: border-box;
}

.panel-header {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.panel-header-left { min-width: 0; flex: 1; }

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

.panel-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  color: #e94560;
  background: rgba(233, 69, 96, 0.15);
  padding: 3px 10px;
  border-radius: 20px;
  margin-bottom: 6px;
}

.panel-header h3 { font-size: 14px; margin: 0 0 4px; }
.panel-sub { color: #aaa; font-size: 12px; margin: 0; }

.choice-list { display: flex; flex-direction: column; gap: 8px; }

.choice-btn {
  text-align: left;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
}

.choice-btn:hover:not(:disabled) { background: rgba(83, 82, 237, 0.25); border-color: rgba(83, 82, 237, 0.5); }
.choice-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.choice-label { display: block; font-weight: 700; font-size: 14px; }
.choice-desc { display: block; font-size: 12px; color: #aaa; margin-top: 4px; }
.choice-preview { display: block; font-size: 11px; color: #e94560; margin-top: 4px; }

.stats-block {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.stats-title { font-size: 11px; color: #888; margin-bottom: 8px; }
.stat-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 11px; }
.stat-label { width: 72px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stat-bar-wrap { flex: 1; height: 4px; background: rgba(255, 255, 255, 0.1); border-radius: 2px; overflow: hidden; }
.stat-bar { height: 100%; background: #5352ed; }
.stat-pct { width: 32px; text-align: right; color: #aaa; }

.branch-panel-enter-active,
.branch-panel-leave-active { transition: transform 0.24s ease, opacity 0.24s ease; }
.branch-panel-enter-from,
.branch-panel-leave-to { transform: translateX(12px); opacity: 0; }
</style>
