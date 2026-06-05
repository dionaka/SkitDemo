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
      <div v-for="(d, i) in sceneLines" :key="'d'+i" class="danmaku" :style="danmakuStyle(i)">{{ d }}</div>
    </template>

    <template v-if="cssClass === 'suspense'">
      <div class="suspense-vignette" />
      <div v-for="i in 8" :key="'s'+i" class="suspense-fog" :style="fogStyle(i)" />
      <div class="center-mark suspense-mark">?</div>
    </template>

    <template v-if="cssClass === 'funny'">
      <div v-for="i in 12" :key="'f'+i" class="funny-emoji" :style="funnyStyle(i)">😂</div>
    </template>

    <template v-if="cssClass === 'touch'">
      <div v-for="i in 18" :key="'t'+i" class="tear" :style="tearStyle(i)">💧</div>
    </template>

    <template v-if="cssClass === 'rage'">
      <div class="rage-glow" />
      <div v-for="i in 10" :key="'r'+i" class="flame" :style="flameStyle(i)">🔥</div>
    </template>

    <template v-if="cssClass === 'shock'">
      <div class="shock-flash" />
      <div class="center-mark shock-mark">!!</div>
    </template>

    <template v-if="cssClass === 'quote'">
      <div v-for="(q, i) in quoteLines" :key="'q'+i" class="quote-line" :style="quoteStyle(i)">「{{ q }}」</div>
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

const sceneLines = ['名场面！', '太精彩了', '666', '反复观看', '截图留念', '绝了'];
const quoteLines = ['这句太绝了', '教科书级别', '全文背诵', '说进心坎里', '封神台词'];

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

function fogStyle(i) {
  return {
    left: `${(i * 13) % 100}%`,
    animationDelay: `${i * 0.25}s`,
    opacity: 0.35 + (i % 3) * 0.15,
  };
}

function funnyStyle(i) {
  return {
    left: `${8 + (i * 7) % 84}%`,
    animationDelay: `${i * 0.12}s`,
    fontSize: `${22 + (i % 4) * 6}px`,
  };
}

function tearStyle(i) {
  return {
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 1.5}s`,
    fontSize: `${14 + Math.random() * 12}px`,
  };
}

function flameStyle(i) {
  return {
    left: `${5 + (i * 9) % 90}%`,
    bottom: `${(i % 3) * 8}%`,
    animationDelay: `${i * 0.1}s`,
  };
}

function quoteStyle(i) {
  return {
    top: `${12 + (i % 5) * 16}%`,
    animationDuration: `${3.5 + i * 0.3}s`,
    animationDelay: `${i * 0.35}s`,
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

.center-mark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: 800;
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

.suspense-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 30%, rgba(30, 27, 75, 0.55) 100%);
  animation: pulse-dark 1.2s ease-in-out infinite;
}

.suspense-fog {
  position: absolute;
  bottom: 0;
  width: 40%;
  height: 55%;
  background: linear-gradient(transparent, rgba(124, 58, 237, 0.35));
  filter: blur(12px);
  animation: drift-fog 2.5s ease-in-out infinite alternate;
}

.suspense-mark {
  font-size: 72px;
  color: #c4b5fd;
  text-shadow: 0 0 24px rgba(124, 58, 237, 0.9);
  animation: pulse-scale 1s ease-in-out infinite;
}

.funny-emoji {
  position: absolute;
  bottom: -40px;
  animation: bounce-up 1.8s ease-out forwards;
}

.tear {
  position: absolute;
  top: -20px;
  color: #74c0fc;
  animation: fall-down 2.8s linear forwards;
}

.rage-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 80%, rgba(255, 99, 72, 0.35), transparent 60%);
  animation: pulse-dark 0.8s ease-in-out infinite;
}

.flame {
  position: absolute;
  font-size: 28px;
  animation: flame-rise 1.6s ease-out forwards;
}

.shock-flash {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.85);
  animation: shock-blink 0.35s ease-out 2;
}

.shock-mark {
  font-size: 80px;
  color: #333;
  animation: shock-pop 0.4s ease-out;
}

.quote-line {
  position: absolute;
  white-space: nowrap;
  color: #63e6be;
  font-size: 17px;
  font-weight: 700;
  text-shadow: 0 0 8px rgba(32, 201, 151, 0.8);
  animation: scroll-left linear forwards;
  right: -280px;
}

@keyframes flash { 0%,100% { opacity: 0; } 50% { opacity: 1; } }
@keyframes shake { 0%,100% { transform: translate(-50%,-50%) rotate(0); } 25% { transform: translate(-52%,-48%) rotate(-5deg); } 75% { transform: translate(-48%,-52%) rotate(5deg); } }
@keyframes float-up { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-500px); opacity: 0; } }
@keyframes scroll-left { 0% { right: -280px; } 100% { right: 110%; } }
@keyframes pulse-dark { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
@keyframes drift-fog { 0% { transform: translateX(-8%); } 100% { transform: translateX(8%); } }
@keyframes pulse-scale { 0%,100% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(1.08); } }
@keyframes bounce-up { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(-420px); opacity: 0; } }
@keyframes fall-down { 0% { transform: translateY(0); opacity: 0.9; } 100% { transform: translateY(520px); opacity: 0; } }
@keyframes flame-rise { 0% { transform: translateY(0) scale(0.8); opacity: 1; } 100% { transform: translateY(-360px) scale(1.2); opacity: 0; } }
@keyframes shock-blink { 0% { opacity: 0.9; } 100% { opacity: 0; } }
@keyframes shock-pop { 0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0; } 100% { transform: translate(-50%,-50%) scale(1); opacity: 1; } }
</style>
