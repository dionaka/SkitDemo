<template>
  <div class="danmaku-send-bar">
    <div v-if="!loggedIn" class="danmaku-hint">登录后可发弹幕</div>
    <template v-else>
      <div class="color-row">
        <button
          v-for="c in colors"
          :key="c"
          type="button"
          class="color-dot"
          :class="{ active: color === c }"
          :style="{ background: c }"
          :aria-label="`颜色 ${c}`"
          @click="color = c"
        />
      </div>
      <div class="input-row">
        <input
          v-model="text"
          type="text"
          maxlength="40"
          placeholder="发条弹幕…"
          :disabled="sending || disabled"
          @keydown.enter.prevent="submit"
        />
        <el-button type="primary" size="small" :loading="sending" :disabled="disabled || !text.trim()" @click="submit">
          发送
        </el-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  loggedIn: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['send', 'error']);

const colors = ['#ffffff', '#ff6b6b', '#ffd166', '#69db7c', '#74c0fc'];
const color = ref(colors[0]);
const text = ref('');
const sending = ref(false);

async function submit() {
  const content = text.value.trim();
  if (!content || sending.value) return;
  sending.value = true;
  try {
    emit('send', { content, color: color.value });
    text.value = '';
  } catch (e) {
    emit('error', e);
  } finally {
    sending.value = false;
  }
}
</script>

<style scoped>
.danmaku-send-bar {
  margin: 12px 0 0;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.danmaku-hint {
  font-size: 13px;
  color: #868e96;
  text-align: center;
}

.color-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.color-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  padding: 0;
  cursor: pointer;
}

.color-dot.active {
  border-color: #333;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-row input {
  flex: 1;
  min-width: 0;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 14px;
}
</style>
