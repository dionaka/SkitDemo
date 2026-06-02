<template>
  <SettingsSection title="首页" description="控制首页展示内容">
    <div class="card home-prefs-card">
      <label class="toggle-row">
        <div class="toggle-copy">
          <span class="toggle-title">继续观看</span>
          <span class="toggle-desc">在首页显示最近播放的短剧</span>
        </div>
        <input
          v-model="showContinueWatching"
          type="checkbox"
          class="toggle-input"
          @change="onToggle"
        />
      </label>
    </div>
  </SettingsSection>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import SettingsSection from './SettingsSection.vue';
import { getHomePreferences, saveHomePreferences } from '@/utils/homePreferences';

const showContinueWatching = ref(true);

onMounted(() => {
  showContinueWatching.value = getHomePreferences().showContinueWatching;
});

function onToggle() {
  saveHomePreferences({ showContinueWatching: showContinueWatching.value });
}
</script>

<style scoped>
.home-prefs-card {
  padding: 0;
  overflow: hidden;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  cursor: pointer;
  user-select: none;
}

.toggle-copy {
  flex: 1;
  min-width: 0;
}

.toggle-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
}

.toggle-desc {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.toggle-input {
  flex-shrink: 0;
  width: 46px;
  height: 28px;
  appearance: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid var(--border);
  position: relative;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.toggle-input::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s ease;
}

.toggle-input:checked {
  background: var(--accent);
  border-color: transparent;
}

.toggle-input:checked::after {
  transform: translateX(18px);
}
</style>
