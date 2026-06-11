<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  visible: Boolean,
  effectType: String,
  senderName: {
    type: String,
    default: '神秘用户'
  }
});

const GIFT_META = {
  plane: { image: '/gifts/plane.png', emoji: '✈️', name: '飞机', anim: 'slide' },
  car: { image: '/gifts/car.png', emoji: '🏎️', name: '跑车', anim: 'slide' },
  castle: { image: '/gifts/castle.png', emoji: '🏰', name: '城堡', anim: 'pop' },
  crown: { emoji: '👑', name: '皇冠', anim: 'pop', premium: true },
  carnival: { emoji: '🎉', name: '嘉年华', anim: 'pop', premium: true },
  rocket: { image: '/gifts/rocket.png', emoji: '🚀', name: '火箭', anim: 'rise' },
};

const CONFETTI_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b9d', '#c9b1ff', '#ff9f43'];
const CONFETTI_SHAPES = ['●', '★', '▲', '♦'];

const currentEffect = ref('');

const giftMeta = computed(() => GIFT_META[currentEffect.value] || null);
const isPremium = computed(() => !!giftMeta.value?.premium);

watch(() => props.visible, (val) => {
  if (val) {
    currentEffect.value = props.effectType;
  } else {
    setTimeout(() => {
      currentEffect.value = '';
    }, 100);
  }
});

function seeded(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function confettiStyle(i) {
  const r = seeded(i);
  const r2 = seeded(i + 50);
  const r3 = seeded(i + 100);
  return {
    left: `${r * 100}%`,
    animationDelay: `${r2 * 2.5}s`,
    animationDuration: `${2.5 + r3 * 2}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    fontSize: `${8 + (i % 5) * 3}px`,
    '--drift': `${(r - 0.5) * 60}px`,
  };
}

function fireworkStyle(i) {
  const r = seeded(i + 200);
  const r2 = seeded(i + 250);
  return {
    left: `${15 + r * 70}%`,
    top: `${20 + r2 * 45}%`,
    animationDelay: `${r * 1.5}s`,
  };
}

function spotlightStyle(i) {
  return {
    '--angle': `${i * 120}deg`,
    animationDelay: `${i * 0.6}s`,
  };
}

function rayStyle(i) {
  return {
    transform: `rotate(${i * 30}deg)`,
    animationDelay: `${(i % 4) * 0.15}s`,
  };
}

function rippleStyle(i) {
  return { animationDelay: `${i * 0.5}s` };
}

function sparkleStyle(i) {
  const r = seeded(i + 300);
  const r2 = seeded(i + 350);
  return {
    left: `${20 + r * 60}%`,
    top: `${15 + r2 * 55}%`,
    animationDelay: `${r * 2}s`,
    fontSize: `${8 + (i % 4) * 4}px`,
  };
}
</script>

<template>
  <div
    v-if="visible && giftMeta"
    class="gift-effect-container"
    :class="[giftMeta.anim, currentEffect, { premium: isPremium }]"
  >
    <template v-if="currentEffect === 'carnival'">
      <div class="carnival-bg" />
      <div class="carnival-spotlights">
        <div v-for="i in 3" :key="'sl' + i" class="spotlight-beam" :style="spotlightStyle(i)" />
      </div>
      <div class="carnival-confetti">
        <div
          v-for="i in 22"
          :key="'c' + i"
          class="confetti-piece"
          :style="confettiStyle(i)"
        >
          {{ CONFETTI_SHAPES[i % CONFETTI_SHAPES.length] }}
        </div>
      </div>
      <div class="carnival-fireworks">
        <div v-for="i in 4" :key="'fw' + i" class="firework-burst" :style="fireworkStyle(i)">
          <span class="firework-core">✨</span>
          <span v-for="j in 6" :key="'fs' + i + '-' + j" class="firework-spark" :style="{ '--spark-angle': j * 60 + 'deg' }" />
        </div>
      </div>
      <div class="carnival-flash" />
    </template>

    <template v-if="currentEffect === 'crown'">
      <div class="crown-bg" />
      <div class="crown-rays">
        <div v-for="i in 10" :key="'ray' + i" class="light-ray" :style="rayStyle(i)" />
      </div>
      <div class="crown-ripples">
        <div v-for="i in 3" :key="'rip' + i" class="ripple-ring" :style="rippleStyle(i)" />
      </div>
      <div class="crown-sparkles">
        <div v-for="i in 10" :key="'sp' + i" class="sparkle" :style="sparkleStyle(i)">✨</div>
      </div>
      <div class="crown-shimmer" />
    </template>

    <div class="gift-stage" :class="{ 'stage-premium': isPremium }">
      <img v-if="giftMeta.image" :src="giftMeta.image" class="gift-image" :alt="giftMeta.name" />
      <span v-else class="gift-emoji" :class="currentEffect">{{ giftMeta.emoji }}</span>
      <div class="gift-glow" :class="currentEffect" />
      <div v-if="currentEffect === 'crown'" class="crown-halo" />
    </div>

    <div class="gift-message" :class="currentEffect + '-message'">
      <span class="gift-sender">{{ senderName }}</span>
      <span class="gift-text">送出了</span>
      <span class="gift-highlight">{{ giftMeta.emoji }} {{ giftMeta.name }}</span>
    </div>
  </div>
</template>

<style scoped>
.gift-effect-container {
  position: absolute;
  inset: 0;
  z-index: 200;
  pointer-events: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.carnival-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center,
    rgba(255, 80, 150, 0.25) 0%,
    rgba(120, 60, 220, 0.2) 45%,
    transparent 75%
  );
  animation: carnival-bg-pulse 2s ease-in-out infinite;
}

.carnival-spotlights {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spotlight-beam {
  position: absolute;
  width: 90px;
  height: 200%;
  background: linear-gradient(to bottom,
    transparent 0%,
    rgba(255, 220, 100, 0.15) 30%,
    rgba(255, 100, 200, 0.2) 50%,
    transparent 80%
  );
  transform-origin: center top;
  transform: rotate(var(--angle));
  animation: spotlight-sweep 3s ease-in-out infinite;
  filter: blur(6px);
}

.carnival-confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.confetti-piece {
  position: absolute;
  top: -15px;
  animation: confetti-fall linear infinite;
}

.carnival-fireworks {
  position: absolute;
  inset: 0;
}

.firework-burst {
  position: absolute;
  width: 0;
  height: 0;
  animation: firework-pop 1.2s ease-out infinite;
}

.firework-core {
  position: absolute;
  font-size: 22px;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 0 6px gold);
}

.firework-spark {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #ffd700;
  box-shadow: 0 0 5px #ff6b6b, 0 0 8px #ffd93d;
  transform: translate(-50%, -50%) rotate(var(--spark-angle)) translateY(-18px);
  animation: spark-fade 1.2s ease-out infinite;
}

.carnival-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, transparent 60%);
  animation: flash-pulse 1.5s ease-in-out infinite;
}

.crown-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center 40%,
    rgba(255, 200, 50, 0.3) 0%,
    rgba(80, 40, 120, 0.35) 50%,
    transparent 80%
  );
}

.crown-rays {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  animation: rays-rotate 8s linear infinite;
}

.light-ray {
  position: absolute;
  bottom: 0;
  left: -1.5px;
  width: 3px;
  height: 110px;
  transform-origin: bottom center;
  background: linear-gradient(to top, rgba(255, 215, 0, 0.7), transparent);
  filter: blur(1px);
  animation: ray-flicker 1.2s ease-in-out infinite;
}

.crown-ripples {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.ripple-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50px;
  height: 50px;
  transform: translate(-50%, -50%);
  border: 2px solid rgba(255, 215, 0, 0.5);
  border-radius: 50%;
  animation: ripple-expand 2s ease-out infinite;
}

.crown-sparkles {
  position: absolute;
  inset: 0;
}

.sparkle {
  position: absolute;
  animation: sparkle-twinkle 2s ease-in-out infinite;
  filter: drop-shadow(0 0 3px gold);
}

.crown-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.08) 50%,
    transparent 60%
  );
  animation: shimmer-sweep 3s ease-in-out infinite;
}

.gift-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.stage-premium {
  animation: premium-enter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.gift-image {
  width: min(160px, 45vw);
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.35));
}

.gift-emoji {
  font-size: min(100px, 28vw);
  line-height: 1;
  filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.3));
  position: relative;
  z-index: 1;
}

.gift-emoji.crown {
  filter: drop-shadow(0 0 24px rgba(255, 215, 0, 0.8)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.3));
  animation: crown-float 2s ease-in-out infinite;
}

.gift-emoji.carnival {
  animation: carnival-bounce 1s ease-in-out infinite;
}

.gift-glow {
  position: absolute;
  inset: -30%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.35) 0%, transparent 70%);
  animation: glow-pulse 1.5s ease-in-out infinite;
}

.gift-glow.crown {
  background: radial-gradient(circle, rgba(255, 215, 0, 0.5) 0%, rgba(255, 140, 0, 0.2) 40%, transparent 70%);
}

.gift-glow.carnival {
  background: radial-gradient(circle,
    rgba(255, 100, 200, 0.4) 0%,
    rgba(100, 150, 255, 0.25) 50%,
    transparent 70%
  );
  animation: carnival-glow 1.2s ease-in-out infinite;
}

.crown-halo {
  position: absolute;
  inset: -50%;
  border: 2px solid rgba(255, 215, 0, 0.3);
  border-radius: 50%;
  animation: halo-spin 6s linear infinite;
}

.crown-halo::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 1px dashed rgba(255, 215, 0, 0.2);
  border-radius: 50%;
}

.gift-message {
  position: absolute;
  bottom: 16%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  border-radius: 40px;
  animation: message-pop 0.5s ease-out;
  white-space: nowrap;
  z-index: 10;
}

.crown-message {
  border: 1px solid rgba(255, 215, 0, 0.35);
  box-shadow: 0 0 16px rgba(255, 215, 0, 0.2);
}

.carnival-message {
  border: 1px solid rgba(255, 107, 157, 0.35);
  box-shadow: 0 0 16px rgba(255, 100, 200, 0.2);
}

.gift-sender {
  color: #ffd700;
  font-size: 14px;
  font-weight: bold;
}

.gift-text {
  color: #fff;
  font-size: 13px;
}

.gift-highlight {
  color: #ff6b6b;
  font-size: 15px;
  font-weight: bold;
}

.crown-message .gift-highlight { color: #ffd700; }
.carnival-message .gift-highlight { color: #ff6b9d; }

.slide .gift-stage { animation: gift-slide 2.5s ease-in-out forwards; }
.pop:not(.premium) .gift-stage { animation: gift-pop 2s ease-out forwards; }
.rise .gift-stage { animation: gift-rise 2.5s ease-out forwards; }

@keyframes gift-slide {
  0% { transform: translateX(-80vw) scale(0.8); opacity: 0; }
  15% { opacity: 1; }
  50% { transform: translateX(0) scale(1); opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translateX(80vw) scale(0.8); opacity: 0; }
}

@keyframes gift-pop {
  0% { transform: scale(0); opacity: 0; }
  30% { transform: scale(1.15); opacity: 1; }
  60% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes gift-rise {
  0% { transform: translateY(60px) scale(0.6); opacity: 0; }
  40% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-20px) scale(1); opacity: 1; }
}

@keyframes premium-enter {
  0% { transform: scale(0) rotate(-20deg); opacity: 0; }
  60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.1); }
}

@keyframes carnival-glow {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
}

@keyframes crown-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes carnival-bounce {
  0%, 100% { transform: scale(1) rotate(-5deg); }
  50% { transform: scale(1.08) rotate(5deg); }
}

@keyframes message-pop {
  0% { transform: translateX(-50%) scale(0); opacity: 0; }
  60% { transform: translateX(-50%) scale(1.08); opacity: 1; }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}

@keyframes carnival-bg-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

@keyframes spotlight-sweep {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.9; }
}

@keyframes confetti-fall {
  0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(110%) translateX(var(--drift)) rotate(540deg); opacity: 0; }
}

@keyframes firework-pop {
  0% { transform: scale(0); opacity: 0; }
  30% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.8); opacity: 0; }
}

@keyframes spark-fade {
  0% { opacity: 1; transform: translate(-50%, -50%) rotate(var(--spark-angle)) translateY(-18px); }
  100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--spark-angle)) translateY(-36px); }
}

@keyframes flash-pulse {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

@keyframes rays-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes ray-flicker {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

@keyframes ripple-expand {
  0% { width: 50px; height: 50px; opacity: 0.8; }
  100% { width: 220px; height: 220px; opacity: 0; }
}

@keyframes sparkle-twinkle {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1.2); }
}

@keyframes shimmer-sweep {
  0% { left: -100%; }
  50%, 100% { left: 150%; }
}

@keyframes halo-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
