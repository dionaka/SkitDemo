<template>
  <div
    v-if="background.isActive"
    class="app-bg-layer"
    aria-hidden="true"
  >
    <div class="app-bg-image" :style="background.layerStyle" />
    <div class="app-bg-scrim" :style="background.scrimStyle" />
  </div>
</template>

<script setup>
import { useAppBackgroundStore } from '@/stores/appBackground';

const background = useAppBackgroundStore();
</script>

<style scoped>
.app-bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.app-bg-image {
  position: absolute;
  inset: -12px;
  background-color: #07070d;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  will-change: transform, filter;
}

.app-bg-scrim {
  position: absolute;
  inset: 0;
}
</style>
