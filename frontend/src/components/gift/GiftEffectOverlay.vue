<template>
  <Teleport to="body">
    <div v-if="visible" class="gift-effect-container" :class="currentEffect">
      <!-- 飞机特效 -->
      <div v-if="currentEffect === 'plane'" class="plane-effect">
        <div class="plane-wrapper">
          <div class="plane">✈️</div>
          <div class="plane-trail"></div>
          <div class="plane-clouds">
            <div v-for="i in 5" :key="i" class="cloud" :style="cloudStyle(i)"></div>
          </div>
        </div>
        <div class="gift-message plane-message">
          <span class="gift-sender">{{ senderName }}</span>
          <span class="gift-text">送出了</span>
          <span class="gift-highlight">✈️ 飞机</span>
        </div>
      </div>

      <!-- 跑车特效 -->
      <div v-if="currentEffect === 'car'" class="car-effect">
        <div class="car-track">
          <div v-for="i in 6" :key="i" class="track-line" :style="trackLineStyle(i)"></div>
        </div>
        <div class="car-wrapper">
          <div class="car">🏎️</div>
          <div class="car-speed-lines">
            <div v-for="i in 8" :key="i" class="speed-line" :style="speedLineStyle(i)"></div>
          </div>
          <div class="car-sparkles">
            <div v-for="i in 12" :key="i" class="sparkle" :style="sparkleStyle(i)"></div>
          </div>
        </div>
        <div class="gift-message car-message">
          <span class="gift-sender">{{ senderName }}</span>
          <span class="gift-text">送出了</span>
          <span class="gift-highlight">🏎️ 跑车</span>
        </div>
      </div>

      <!-- 嘉年华特效 -->
      <div v-if="currentEffect === 'carnival'" class="carnival-effect">
        <div class="confetti-container">
          <div v-for="i in 50" :key="i" class="confetti" :style="confettiStyle(i)">
            {{ confettiEmojis[i % confettiEmojis.length] }}
          </div>
        </div>
        <div class="spotlights">
          <div v-for="i in 4" :key="i" class="spotlight" :style="spotlightStyle(i)"></div>
        </div>
        <div class="gift-message carnival-message">
          <span class="gift-sender">{{ senderName }}</span>
          <span class="gift-text">送出了</span>
          <span class="gift-highlight">🎉 嘉年华</span>
        </div>
      </div>

      <!-- 火箭特效 -->
      <div v-if="currentEffect === 'rocket'" class="rocket-effect">
        <div class="rocket-wrapper">
          <div class="rocket">🚀</div>
          <div class="rocket-flames">
            <div v-for="i in 5" :key="i" class="flame" :style="flameStyle(i)"></div>
          </div>
          <div class="rocket-stars">
            <div v-for="i in 20" :key="i" class="star" :style="starStyle(i)"></div>
          </div>
        </div>
        <div class="gift-message rocket-message">
          <span class="gift-sender">{{ senderName }}</span>
          <span class="gift-text">送出了</span>
          <span class="gift-highlight">🚀 火箭</span>
        </div>
      </div>

      <!-- 城堡特效 -->
      <div v-if="currentEffect === 'castle'" class="castle-effect">
        <div class="castle-wrapper">
          <div class="castle">🏰</div>
          <div class="castle-sparkles">
            <div v-for="i in 30" :key="i" class="castle-sparkle" :style="castleSparkleStyle(i)"></div>
          </div>
          <div class="castle-rainbow">
            <div class="rainbow-arc"></div>
          </div>
        </div>
        <div class="gift-message castle-message">
          <span class="gift-sender">{{ senderName }}</span>
          <span class="gift-text">送出了</span>
          <span class="gift-highlight">🏰 城堡</span>
        </div>
      </div>

      <!-- 皇冠特效 -->
      <div v-if="currentEffect === 'crown'" class="crown-effect">
        <div class="crown-wrapper">
          <div class="crown">👑</div>
          <div class="crown-rays">
            <div v-for="i in 12" :key="i" class="ray" :style="rayStyle(i)"></div>
          </div>
          <div class="crown-particles">
            <div v-for="i in 25" :key="i" class="particle" :style="particleStyle(i)"></div>
          </div>
        </div>
        <div class="gift-message crown-message">
          <span class="gift-sender">{{ senderName }}</span>
          <span class="gift-text">送出了</span>
          <span class="gift-highlight">👑 皇冠</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  visible: Boolean,
  effectType: String,
  senderName: {
    type: String,
    default: '神秘用户'
  }
});

const currentEffect = ref('');

const confettiEmojis = ['🎊', '🎉', '🎈', '🎁', '✨', '💫', '🌟', '⭐', '🎆', '🎇'];

watch(() => props.visible, (val) => {
  if (val) {
    currentEffect.value = props.effectType;
  } else {
    setTimeout(() => {
      currentEffect.value = '';
    }, 100);
  }
});

function cloudStyle(i) {
  return {
    left: `${10 + i * 18}%`,
    animationDelay: `${i * 0.3}s`,
    opacity: 0.3 + (i % 3) * 0.2
  };
}

function trackLineStyle(i) {
  return {
    top: `${15 + (i % 3) * 25}%`,
    animationDelay: `${i * 0.15}s`
  };
}

function speedLineStyle(i) {
  return {
    left: `${5 + (i * 12) % 80}%`,
    top: `${20 + (i * 17) % 60}%`,
    animationDelay: `${i * 0.1}s`,
    opacity: 0.3 + (i % 4) * 0.15
  };
}

function sparkleStyle(i) {
  return {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 0.5}s`,
    fontSize: `${8 + (i % 5) * 4}px`
  };
}

function confettiStyle(i) {
  const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b9d', '#c9b1ff'];
  return {
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 2}s`,
    animationDuration: `${2 + Math.random() * 2}s`,
    background: colors[i % colors.length],
    fontSize: `${12 + (i % 6) * 4}px`,
    transform: `rotate(${Math.random() * 360}deg)`
  };
}

function spotlightStyle(i) {
  return {
    left: `${15 + i * 22}%`,
    animationDelay: `${i * 0.4}s`
  };
}

function flameStyle(i) {
  return {
    left: `${40 + (i % 5) * 5}%`,
    animationDelay: `${i * 0.08}s`,
    opacity: 0.4 + (i % 3) * 0.2
  };
}

function starStyle(i) {
  return {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 1}s`,
    opacity: 0.3 + Math.random() * 0.5
  };
}

function castleSparkleStyle(i) {
  return {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 1.5}s`,
    fontSize: `${6 + (i % 4) * 4}px`
  };
}

function rayStyle(i) {
  return {
    transform: `rotate(${i * 30}deg)`,
    animationDelay: `${i * 0.1}s`
  };
}

function particleStyle(i) {
  return {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 0.8}s`,
    opacity: 0.4 + Math.random() * 0.4
  };
}
</script>

<style scoped>
.gift-effect-container {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  overflow: hidden;
}

/* 通用礼物消息样式 */
.gift-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: message-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  z-index: 10;
}

.gift-sender {
  color: #ffd700;
  font-size: 20px;
  font-weight: 700;
}

.gift-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 18px;
}

.gift-highlight {
  font-size: 28px;
  animation: gift-bounce 0.8s ease infinite;
}

/* 飞机特效 */
.plane-effect {
  background: linear-gradient(180deg,
    rgba(135, 206, 235, 0.3) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(135, 206, 235, 0.3) 100%
  );
}

.plane-wrapper {
  position: absolute;
  top: 50%;
  left: -150px;
  transform: translateY(-50%);
  animation: plane-fly 2.5s ease-in-out forwards;
}

.plane {
  font-size: 120px;
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5));
  transform: scaleX(-1);
}

.plane-trail {
  position: absolute;
  top: 50%;
  right: 100%;
  width: 300px;
  height: 4px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8));
  transform: translateY(-50%);
}

.plane-clouds .cloud {
  position: absolute;
  width: 60px;
  height: 30px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  filter: blur(8px);
  animation: cloud-drift 3s ease-in-out infinite;
}

@keyframes plane-fly {
  0% {
    left: -150px;
    transform: translateY(-50%) rotate(-5deg);
  }
  20% {
    transform: translateY(-50%) rotate(5deg);
  }
  40% {
    transform: translateY(-50%) rotate(-3deg);
  }
  60% {
    transform: translateY(-50%) rotate(3deg);
  }
  80% {
    transform: translateY(-50%) rotate(-2deg);
  }
  100% {
    left: calc(100% + 150px);
    transform: translateY(-50%) rotate(0deg);
  }
}

@keyframes cloud-drift {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(30px); }
}

/* 跑车特效 */
.car-effect {
  background: linear-gradient(180deg,
    rgba(30, 30, 40, 0.9) 0%,
    rgba(50, 50, 60, 0.8) 100%
  );
}

.car-track {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.track-line {
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 20%,
    rgba(255, 255, 255, 0.5) 50%,
    rgba(255, 255, 255, 0.3) 80%,
    transparent 100%
  );
  animation: track-move 0.4s linear infinite;
}

@keyframes track-move {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.car-wrapper {
  position: absolute;
  top: 50%;
  left: -150px;
  transform: translateY(-50%);
  animation: car-race 2s ease-in-out forwards;
}

.car {
  font-size: 100px;
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5));
}

.car-speed-lines .speed-line {
  position: absolute;
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #fff);
  animation: speed-line 0.3s linear infinite;
}

@keyframes speed-line {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-100px);
  }
}

.car-sparkles .sparkle {
  position: absolute;
  color: #ffd700;
  animation: sparkle-fade 0.6s ease-out infinite;
}

@keyframes sparkle-fade {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0) translateY(-20px);
  }
}

@keyframes car-race {
  0% {
    left: -150px;
  }
  100% {
    left: calc(100% + 150px);
  }
}

/* 嘉年华特效 */
.carnival-effect {
  background: radial-gradient(ellipse at center,
    rgba(77, 35, 80, 0.95) 0%,
    rgba(20, 20, 30, 0.95) 100%
  );
}

.confetti-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.confetti {
  position: absolute;
  top: -30px;
  animation: confetti-fall linear forwards;
  border-radius: 4px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0.5;
  }
}

.spotlights .spotlight {
  position: absolute;
  top: 0;
  width: 200px;
  height: 100%;
  background: linear-gradient(180deg,
    rgba(255, 215, 0, 0.3) 0%,
    transparent 100%
  );
  transform-origin: top center;
  animation: spotlight-swing 2s ease-in-out infinite alternate;
}

@keyframes spotlight-swing {
  0% { transform: rotate(-15deg); }
  100% { transform: rotate(15deg); }
}

/* 火箭特效 */
.rocket-effect {
  background: linear-gradient(180deg,
    rgba(10, 10, 30, 0.98) 0%,
    rgba(20, 10, 40, 0.95) 50%,
    rgba(40, 20, 60, 0.9) 100%
  );
}

.rocket-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: rocket-launch 2s ease-out forwards;
}

.rocket {
  font-size: 100px;
  filter: drop-shadow(0 0 30px rgba(255, 200, 100, 0.8));
  position: relative;
  z-index: 2;
}

.rocket-flames .flame {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 30px solid #ff6b35;
  animation: flame-flicker 0.1s ease infinite;
  filter: blur(2px);
}

@keyframes flame-flicker {
  0%, 100% { opacity: 0.8; transform: translateX(-50%) scaleY(1); }
  50% { opacity: 1; transform: translateX(-50%) scaleY(1.2); }
}

.rocket-stars .star {
  position: absolute;
  color: #fff;
  animation: star-twinkle 1s ease-in-out infinite;
}

@keyframes star-twinkle {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.5); }
}

@keyframes rocket-launch {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0;
  }
  20% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 1;
  }
  80% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, 100%) scale(0.8);
    opacity: 0;
  }
}

/* 城堡特效 */
.castle-effect {
  background: linear-gradient(180deg,
    rgba(20, 40, 80, 0.95) 0%,
    rgba(60, 40, 80, 0.9) 50%,
    rgba(40, 60, 100, 0.85) 100%
  );
}

.castle-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: castle-appear 2.5s ease-out forwards;
}

.castle {
  font-size: 150px;
  filter: drop-shadow(0 0 40px rgba(255, 215, 0, 0.6));
  animation: castle-float 3s ease-in-out infinite;
}

@keyframes castle-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.castle-sparkles .castle-sparkle {
  position: absolute;
  color: #ffd700;
  animation: castle-sparkle 1.5s ease-in-out infinite;
}

@keyframes castle-sparkle {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.castle-rainbow {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  height: 100px;
}

.rainbow-arc {
  width: 100%;
  height: 100%;
  background: conic-gradient(
    from 180deg at 50% 0%,
    rgba(255, 0, 0, 0.3) 0deg,
    rgba(255, 127, 0, 0.3) 30deg,
    rgba(255, 255, 0, 0.3) 60deg,
    rgba(0, 255, 0, 0.3) 90deg,
    rgba(0, 127, 255, 0.3) 120deg,
    rgba(127, 0, 255, 0.3) 150deg,
    transparent 180deg
  );
  filter: blur(10px);
  animation: rainbow-glow 2s ease-in-out infinite;
}

@keyframes rainbow-glow {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}

@keyframes castle-appear {
  0% {
    transform: translate(-50%, -50%) scale(0) rotate(-10deg);
    opacity: 0;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1) rotate(5deg);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
    opacity: 1;
  }
}

/* 皇冠特效 */
.crown-effect {
  background: radial-gradient(ellipse at center,
    rgba(50, 30, 10, 0.98) 0%,
    rgba(20, 10, 30, 0.95) 100%
  );
}

.crown-wrapper {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: crown-appear 2s ease-out forwards;
}

.crown {
  font-size: 120px;
  filter: drop-shadow(0 0 50px rgba(255, 215, 0, 0.8));
  animation: crown-pulse 1s ease-in-out infinite;
}

@keyframes crown-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.crown-rays .ray {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 3px;
  height: 150px;
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.8), transparent);
  transform-origin: top center;
  animation: ray-glow 1.5s ease-in-out infinite;
}

@keyframes ray-glow {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.crown-particles .particle {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #ffd700;
  border-radius: 50%;
  animation: particle-float 2s ease-in-out infinite;
  box-shadow: 0 0 10px #ffd700;
}

@keyframes particle-float {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.4;
  }
  50% {
    transform: translateY(-30px) scale(1.5);
    opacity: 1;
  }
}

@keyframes crown-appear {
  0% {
    transform: translate(-50%, -50%) scale(0) rotate(-20deg);
    opacity: 0;
  }
  60% {
    transform: translate(-50%, -50%) scale(1.2) rotate(10deg);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
    opacity: 1;
  }
}

/* 通用动画 */
@keyframes message-pop {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
  60% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

@keyframes gift-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
</style>
