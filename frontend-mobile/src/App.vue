<template>
  <SkinProvider>
    <div class="app-layout" :class="{ 'chrome-hidden': hideChrome }">
      <AppBackgroundLayer v-if="!hideChrome" />
      <main class="app-main" :class="{ 'play-main': hideChrome, 'home-layout': isHomeLayout }">
        <router-view />
      </main>

      <SkinTabBar v-if="!hideChrome" />
    </div>
  </SkinProvider>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppBackgroundLayer from '@/components/AppBackgroundLayer.vue';
import { SkinProvider, SkinTabBar } from '@/skin';

const route = useRoute();
const hideChrome = computed(() => Boolean(route.meta.hideChrome));
const isHomeLayout = computed(() => Boolean(route.meta.homeLayout));
</script>

<style scoped>
.app-layout {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
  z-index: 1;
}

.app-layout.chrome-hidden {
  background: #000;
}

.app-main {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: calc(16px + var(--safe-top)) 16px calc(var(--tab-height) + 16px + var(--safe-bottom));
  overflow-y: auto;
}

.app-main.play-main {
  padding: var(--safe-top) 0 var(--safe-bottom);
}

.app-main.home-layout {
  padding: 0 16px calc(var(--tab-height) + 16px + var(--safe-bottom));
}
</style>
