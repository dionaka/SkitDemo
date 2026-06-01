<template>
  <SettingsSection title="外观设置" description="自定义背景会同步到云端，登录后多端一致">
    <div v-if="!session.isLoggedIn" class="card login-hint-card">
      <p>登录后可上传背景并同步到账号</p>
      <button type="button" class="btn btn-primary" @click="$router.push('/login')">去登录</button>
    </div>

    <div v-else class="card appearance-card">
      <div class="field-label">背景图片</div>
      <div class="upload-row">
        <label class="upload-btn" :class="{ disabled: uploading || background.syncing }">
          <input
            type="file"
            accept="image/*"
            class="upload-input"
            :disabled="uploading || background.syncing"
            @change="onPickImage"
          />
          <span class="upload-icon">🖼️</span>
          <span>{{ uploading ? '处理中...' : background.syncing ? '同步中...' : '从相册选择' }}</span>
        </label>
        <button
          v-if="background.isActive"
          type="button"
          class="btn btn-ghost compact-btn"
          :disabled="background.syncing"
          @click="clearImage"
        >
          清除图片
        </button>
      </div>

      <div v-if="background.imageUrl" class="preview-box">
        <img :src="background.imageUrl" alt="背景预览" class="preview-image" />
      </div>
      <p v-else class="field-hint">尚未设置背景，当前使用默认样式</p>

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
        <p class="field-hint">提高遮罩可让文字更清晰，调整后会自动保存到云端</p>
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

      <button
        type="button"
        class="btn btn-text reset-btn"
        :disabled="!background.isActive || background.syncing"
        @click="resetBackground"
      >
        恢复默认背景
      </button>
    </div>
  </SettingsSection>
</template>

<script setup>
import { ref } from 'vue';
import SettingsSection from './SettingsSection.vue';
import { useAppBackgroundStore } from '@/stores/appBackground';
import { useSessionStore } from '@/stores/session';

const background = useAppBackgroundStore();
const session = useSessionStore();
const uploading = ref(false);
const message = ref('');
const error = ref('');

function flash(msg) {
  message.value = msg;
  error.value = '';
  setTimeout(() => { message.value = ''; }, 1800);
}

async function onPickImage(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  uploading.value = true;
  error.value = '';
  try {
    await background.uploadImageFromFile(file);
    flash('背景已上传并同步到云端');
  } catch (e) {
    error.value = e.message || '背景上传失败';
  } finally {
    uploading.value = false;
  }
}

async function clearImage() {
  error.value = '';
  try {
    await background.clearCloudBackground();
    flash('已清除背景');
  } catch (e) {
    error.value = e.message || '清除失败';
  }
}

function onOverlayChange(event) {
  background.setOverlayOpacity(event.target.value);
}

function onBlurChange(event) {
  background.setBlur(event.target.value);
}

async function resetBackground() {
  error.value = '';
  try {
    await background.clearCloudBackground();
    flash('已恢复默认背景');
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
  gap: 14px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.field-label.inline {
  margin: 0;
}

.upload-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.upload-btn {
  flex: 1;
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

.upload-btn:active:not(.disabled) {
  background: var(--bg-card-hover);
}

.upload-btn.disabled {
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

.compact-btn {
  width: auto;
  min-width: 96px;
  padding: 0 14px;
  min-height: 46px;
}

.preview-box {
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border);
  max-height: 160px;
}

.preview-image {
  display: block;
  width: 100%;
  height: 160px;
  object-fit: cover;
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

.field-hint {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}

.reset-btn {
  align-self: center;
  margin-top: 4px;
}

.reset-btn:disabled {
  opacity: 0.45;
}
</style>
