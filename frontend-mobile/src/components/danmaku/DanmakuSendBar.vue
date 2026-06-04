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
        <button type="button" class="send-btn" :disabled="sending || disabled || !text.trim()" @click="submit">
          {{ sending ? '…' : '发送' }}
        </button>
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
  margin: 10px 0 0;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
}

.danmaku-hint {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
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
  border-color: #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
}

.input-row {
  display: flex;
  gap: 8px;
}

.input-row input {
  flex: 1;
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
}

.send-btn {
  border: none;
  background: linear-gradient(135deg, #ff6b6b, #ffa94d);
  color: #fff;
  border-radius: 8px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.send-btn:disabled {
  opacity: 0.45;
}
</style>
