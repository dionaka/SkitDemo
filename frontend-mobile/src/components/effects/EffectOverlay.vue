<template>
  <div v-if="active && cssClass" class="effect-overlay" :class="cssClass">
    <template v-if="cssClass === 'conflict'">
      <div v-for="i in 5" :key="'l'+i" class="lightning" :style="lightningStyle(i)" />
      <div class="shake-text">⚡</div>
    </template>

    <template v-if="cssClass === 'reversal'">
      <div class="shake-text reversal-mark">↯</div>
    </template>

    <template v-if="cssClass === 'sweet'">
      <div v-for="i in 20" :key="'h'+i" class="heart" :style="heartStyle(i)">❤</div>
    </template>

    <template v-if="cssClass === 'scene'">
      <div v-for="(d, i) in danmakus" :key="'d'+i" class="danmaku" :style="danmakuStyle(i)">{{ d }}</div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getEffectMeta } from '@/utils/effectRegistry';

const props = defineProps({
  effectKey: { type: String, default: 'scene' },
  active: Boolean,
});

const cssClass = computed(() => getEffectMeta(props.effectKey).css || '');

const danmakus = ['名场面！', '太精彩了', '666', '反复观看', '截图留念', '绝了'];

function lightningStyle(i) {
  return { left: `${10 + i * 18}%`, animationDelay: `${i * 0.15}s` };
}

function heartStyle(i) {
  return {
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 2}s`,
    fontSize: `${16 + Math.random() * 20}px`,
  };
}

function danmakuStyle(i) {
  return {
    top: `${10 + (i % 6) * 14}%`,
    animationDuration: `${3 + Math.random() * 3}s`,
    animationDelay: `${i * 0.4}s`,
  };
}
</script>

<style scoped>
.effect-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 10;
}

.shake-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 64px;
  animation: shake 0.5s ease infinite;
}

.reversal-mark {
  font-size: 72px;
  color: #ffd166;
  text-shadow: 0 0 20px rgba(255, 209, 102, 0.8);
}

.lightning {
  position: absolute;
  top: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(transparent, #fff, #ffd700, transparent);
  animation: flash 0.6s ease infinite;
  opacity: 0;
}

.heart {
  position: absolute;
  bottom: -30px;
  color: #ff6b81;
  animation: float-up 3s ease-in forwards;
}

.danmaku {
  position: absolute;
  white-space: nowrap;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
  animation: scroll-left linear forwards;
  right: -200px;
}

@keyframes flash { 0%,100% { opacity: 0; } 50% { opacity: 1; } }
@keyframes shake { 0%,100% { transform: translate(-50%,-50%) rotate(0); } 25% { transform: translate(-52%,-48%) rotate(-5deg); } 75% { transform: translate(-48%,-52%) rotate(5deg); } }
@keyframes float-up { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-500px); opacity: 0; } }
@keyframes scroll-left { 0% { right: -200px; } 100% { right: 110%; } }
</style>
