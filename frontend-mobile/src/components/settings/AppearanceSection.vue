<template>
  <SettingsSection
    title="个性主题"
    description="支持 bilibili-skin 仓库格式的 .json / .zip 主题包，登录后云端同步"
  >
    <div v-if="!session.isLoggedIn" class="card login-hint-card">
      <p>登录后可导入 bilibili-skin 仓库格式的 B 站装扮主题（.json / .zip），并同步到账号。</p>
      <button type="button" class="btn btn-primary" @click="$router.push('/login')">去登录</button>
    </div>

    <div v-else class="card appearance-card">
      <div class="section-block">
        <div class="field-label">导入 B 站主题</div>
        <p class="field-hint">
          支持 `个性装扮.json`、`<主题名>.json`，或包含 `bg/` 文件夹的主题 zip 包。
        </p>
        <button
          type="button"
          class="upload-btn primary"
          :disabled="uploading || skin.syncing"
          @click="pickSkin"
        >
          <span class="upload-icon">📦</span>
          <span>{{ uploading ? '导入中...' : skin.syncing ? '同步中...' : '选择主题文件 (.json / .zip)' }}</span>
        </button>
        <input
          ref="skinRef"
          type="file"
          accept=".json,.zip,application/json,application/zip"
          class="upload-input"
          @change="onPickSkin"
        />
      </div>

      <div v-if="hasTheme" class="current-theme card-lite">
        <div v-if="previewUrl" class="preview-box">
          <img :src="previewUrl" alt="主题预览" class="preview-image" />
        </div>
        <div class="current-theme-info">
          <div class="current-theme-name">
            {{ themeName || '自定义背景' }}
          </div>
          <div class="current-theme-meta">
            {{ skin.isActive ? 'bilibili-skin 主题' : '自定义图片' }}
            <span v-if="skin.theme?.id"> · ID {{ skin.theme.id }}</span>
          </div>
          <div v-if="colorChips.length" class="color-row">
            <span
              v-for="chip in colorChips"
              :key="chip.label"
              class="color-chip"
              :style="{ background: chip.value }"
              :title="chip.label"
            />
          </div>
        </div>
        <button
          type="button"
          class="btn btn-ghost compact-btn"
          :disabled="skin.syncing || background.syncing"
          @click="resetTheme"
        >
          恢复默认
        </button>
      </div>

      <div class="section-block">
        <div class="field-label">自定义背景图</div>
        <button
          type="button"
          class="upload-btn"
          :disabled="uploading || background.syncing"
          @click="pickImage"
        >
          <span class="upload-icon">🖼️</span>
          <span>从相册选择图片</span>
        </button>
        <input
          ref="imageRef"
          type="file"
          accept="image/*"
          class="upload-input"
          @change="onPickImage"
        />
      </div>

      <div class="slider-field">
        <div class="slider-head">
          <span class="field-label inline">遮罩浓度</span>
          <span class="slider-value">{{ background.overlayOpacity }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="85"
          step="1"
          :value="background.overlayOpacity"
          class="slider"
          :disabled="!background.isActive || background.syncing"
          @input="onOverlayChange"
        />
      </div>

      <div class="slider-field">
        <div class="slider-head">
          <span class="field-label inline">背景模糊</span>
          <span class="slider-value">{{ background.blur }}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="24"
          step="1"
          :value="background.blur"
          class="slider"
          :disabled="!background.isActive || background.syncing"
          @input="onBlurChange"
        />
      </div>

      <p v-if="message" class="success-text">{{ message }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
  </SettingsSection>
</template>

<script setup>
import { computed, ref } from 'vue';
import SettingsSection from './SettingsSection.vue';
import { useAppBackgroundStore } from '@/stores/appBackground';
import { useSkinStore } from '@/skin';
import { useSessionStore } from '@/stores/session';

const background = useAppBackgroundStore();
const skin = useSkinStore();
const session = useSessionStore();
const skinRef = ref(null);
const imageRef = ref(null);
const uploading = ref(false);
const message = ref('');
const error = ref('');

const hasTheme = computed(() => skin.isActive || background.isActive);
const themeName = computed(() => skin.themeName || '');
const previewUrl = computed(() => skin.previewUrl || background.imageUrl || '');

const colorChips = computed(() => {
  const colors = skin.themeColors;
  if (!colors) return [];
  return [
    { label: '强调色', value: colors.accent },
    { label: '文字色', value: colors.text },
    { label: '底栏色', value: colors.tabBg },
    { label: '选中色', value: colors.tabActive },
  ].filter((item) => item.value);
});

function flash(msg) {
  message.value = msg;
  error.value = '';
  setTimeout(() => { message.value = ''; }, 2200);
}

function pickSkin() {
  if (uploading.value || skin.syncing) return;
  skinRef.value?.click();
}

function pickImage() {
  if (uploading.value || background.syncing) return;
  imageRef.value?.click();
}

async function onPickSkin(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  uploading.value = true;
  error.value = '';
  try {
    await skin.importFromFile(file);
    flash(`已导入主题：${skin.themeName || 'B站主题'}`);
  } catch (e) {
    error.value = e.message || '主题导入失败';
  } finally {
    uploading.value = false;
  }
}

async function onPickImage(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  uploading.value = true;
  error.value = '';
  try {
    await background.uploadImageFromFile(file);
    flash('自定义背景已上传');
  } catch (e) {
    error.value = e.message || '背景上传失败';
  } finally {
    uploading.value = false;
  }
}

function onOverlayChange(event) {
  background.setOverlayOpacity(event.target.value);
}

function onBlurChange(event) {
  background.setBlur(event.target.value);
}

async function resetTheme() {
  error.value = '';
  try {
    await skin.clearSkin();
    background.resetLocal();
    flash('已恢复默认主题');
  } catch (e) {
    error.value = e.message || '恢复失败';
  }
}
</script>

<style scoped>
.login-hint-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.login-hint-card p {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.appearance-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.field-label.inline {
  margin: 0;
}

.field-hint {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
}

.upload-btn {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border-light);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.upload-btn.primary {
  border-color: rgba(255, 77, 109, 0.35);
  background: var(--accent-soft);
}

.upload-btn:active:not(:disabled) {
  opacity: 0.85;
}

.upload-btn:disabled {
  opacity: 0.6;
  pointer-events: none;
}

.upload-input {
  display: none;
}

.upload-icon {
  font-size: 16px;
  line-height: 1;
}

.current-theme {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-lite {
  padding: 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.03);
}

.preview-box {
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border);
  max-height: 140px;
}

.preview-image {
  display: block;
  width: 100%;
  height: 140px;
  object-fit: cover;
}

.current-theme-name {
  font-size: 16px;
  font-weight: 700;
}

.current-theme-meta {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.color-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.color-chip {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.compact-btn {
  width: 100%;
}

.slider-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.slider-value {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.slider {
  width: 100%;
  accent-color: var(--accent);
}

.slider:disabled {
  opacity: 0.45;
}
</style>
