<template>
  <div class="gift-panel">
    <div class="gift-list">
      <div
        v-for="gift in gifts"
        :key="gift.id"
        class="gift-item"
        :class="{ active: selectedGift?.id === gift.id }"
        @click="selectGift(gift)"
      >
        <div class="gift-icon" :style="{ background: gift.bgColor }">
          <span class="gift-emoji">{{ gift.emoji }}</span>
        </div>
        <div class="gift-info">
          <span class="gift-name">{{ gift.name }}</span>
          <span class="gift-price">{{ gift.price }} 币</span>
        </div>
      </div>
    </div>
    <div class="gift-actions">
      <button
        class="gift-send-btn"
        :disabled="!selectedGift"
        @click="sendGift"
      >
        发送礼物
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['send']);

const gifts = [
  { id: 'plane', name: '飞机', emoji: '✈️', price: 100, bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'car', name: '跑车', emoji: '🏎️', price: 500, bgColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'carnival', name: '嘉年华', emoji: '🎉', price: 1000, bgColor: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'rocket', name: '火箭', emoji: '🚀', price: 2000, bgColor: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { id: 'castle', name: '城堡', emoji: '🏰', price: 5000, bgColor: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' },
  { id: 'crown', name: '皇冠', emoji: '👑', price: 10000, bgColor: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' },
];

const selectedGift = ref(null);

function selectGift(gift) {
  selectedGift.value = selectedGift.value?.id === gift.id ? null : gift;
}

function sendGift() {
  if (selectedGift.value) {
    emit('send', selectedGift.value);
    selectedGift.value = null;
  }
}
</script>

<style scoped>
.gift-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(20, 20, 30, 0.9) 100%);
  backdrop-filter: blur(20px);
  padding: 16px 20px;
  z-index: 100;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.gift-list {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 12px;
  scrollbar-width: none;
}

.gift-list::-webkit-scrollbar {
  display: none;
}

.gift-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 80px;
}

.gift-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-4px);
}

.gift-item.active {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.15);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.gift-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.gift-emoji {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.gift-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.gift-name {
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.gift-price {
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
}

.gift-actions {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.gift-send-btn {
  background: linear-gradient(135deg, #e94560 0%, #ff6b6b 100%);
  color: #fff;
  border: none;
  padding: 12px 48px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(233, 69, 96, 0.4);
}

.gift-send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 6px 25px rgba(233, 69, 96, 0.5);
}

.gift-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
