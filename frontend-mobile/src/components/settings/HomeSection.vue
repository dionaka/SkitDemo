<template>
  <SettingsSection title="界面" description="首页内容与系统栏样式">
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
          @change="onContinueToggle"
        />
      </label>

      <div class="toggle-divider" />

      <label class="toggle-row">
        <div class="toggle-copy">
          <span class="toggle-title">沉浸式状态栏</span>
          <span class="toggle-desc">
            内容延伸到屏幕顶部，状态栏透明（仅 App 生效）
          </span>
        </div>
        <input
          v-model="immersiveStatusBar"
          type="checkbox"
          class="toggle-input"
          @change="onImmersiveToggle"
        />
      </label>

      <div class="toggle-divider" />

      <div class="slider-block">
        <div class="slider-head">
          <div class="toggle-copy">
            <span class="toggle-title">首页横滑灵敏度</span>
            <span class="toggle-desc">调节「热门 / 推荐 / 最新」左右切换的难易度</span>
          </div>
          <span class="slider-value">{{ swipeSensitivityLabel }}</span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          class="slider"
          :value="categorySwipeSensitivity"
          @input="onSwipeSensitivityChange"
        />
        <p class="slider-hint">{{ swipeSensitivityHint }}</p>
        <div class="slider-scale">
          <span>低</span>
          <span>高</span>
        </div>
      </div>
    </div>
  </SettingsSection>
</template>

<script setup>
import { computed, onMounted, onActivated } from 'vue';
import { storeToRefs } from 'pinia';
import SettingsSection from './SettingsSection.vue';
import { useAppPreferencesStore } from '@/stores/appPreferences';
import { getCategorySwipeSensitivityLabel, getCategorySwipeSensitivityHint } from '@/utils/categorySwipeSensitivity';

const appPrefs = useAppPreferencesStore();
const { showContinueWatching, immersiveStatusBar, categorySwipeSensitivity } = storeToRefs(appPrefs);

const swipeSensitivityLabel = computed(() =>
  getCategorySwipeSensitivityLabel(categorySwipeSensitivity.value),
);

const swipeSensitivityHint = computed(() =>
  getCategorySwipeSensitivityHint(categorySwipeSensitivity.value),
);

onMounted(() => {
  appPrefs.hydrate();
});

onActivated(() => {
  appPrefs.hydrate();
});

function onContinueToggle() {
  appPrefs.setShowContinueWatching(showContinueWatching.value);
}

async function onImmersiveToggle() {
  await appPrefs.setImmersiveStatusBar(immersiveStatusBar.value);
}

function onSwipeSensitivityChange(event) {
  appPrefs.setCategorySwipeSensitivity(Number(event.target.value));
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

.toggle-divider {
  height: 1px;
  margin: 0 18px;
  background: var(--border);
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

.slider-block {
  padding: 16px 18px 18px;
}

.slider-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.slider-value {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.4;
}

.slider {
  width: 100%;
  accent-color: var(--accent);
}

.slider-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.slider-scale {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-muted);
}
</style>
