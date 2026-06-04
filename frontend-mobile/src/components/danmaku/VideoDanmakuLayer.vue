<template>
  <div v-show="enabled" class="danmaku-layer">
    <vue-danmaku
      ref="danmakuRef"
      v-model:danmus="danmus"
      :autoplay="false"
      :loop="false"
      :channels="0"
      :speeds="110"
      :debounce="40"
      :random-channel="true"
      :performance-mode="true"
      :z-index="3"
      class="danmaku-canvas"
    >
      <template #danmu="{ danmu }">
        <span class="danmaku-item" :style="{ color: danmu.color || '#ffffff' }">
          <span v-if="danmu.username" class="danmaku-user">{{ danmu.username }}：</span>{{ danmu.text }}
        </span>
      </template>
    </vue-danmaku>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import vueDanmaku from 'vue-danmaku';

const props = defineProps({
  enabled: { type: Boolean, default: true },
  paused: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  items: { type: Array, default: () => [] },
});

const danmakuRef = ref(null);
const danmus = ref([]);
const firedIds = ref(new Set());
const lastSyncTime = ref(0);
let nextIndex = 0;

const queue = computed(() =>
  [...props.items].sort(
    (a, b) => a.position_seconds - b.position_seconds || a.id - b.id,
  ),
);

function insertDanmu(item) {
  danmakuRef.value?.insert({
    text: item.content,
    color: item.color || '#ffffff',
    username: item.user?.username || '',
  });
}

function pushInstant(text, color = '#ffd166', username = '') {
  if (!props.enabled) return;
  danmakuRef.value?.insert({ text, color, username });
}

function drainUntil(time) {
  while (nextIndex < queue.value.length) {
    const item = queue.value[nextIndex];
    if (item.position_seconds > time + 0.15) break;
    if (!firedIds.value.has(item.id)) {
      insertDanmu(item);
      firedIds.value.add(item.id);
    }
    nextIndex += 1;
  }
}

function resetQueueFrom(time) {
  danmakuRef.value?.stop();
  firedIds.value = new Set();
  nextIndex = 0;
  while (nextIndex < queue.value.length && queue.value[nextIndex].position_seconds < time - 0.1) {
    firedIds.value.add(queue.value[nextIndex].id);
    nextIndex += 1;
  }
  nextTick(() => {
    if (!props.paused && props.enabled) {
      danmakuRef.value?.play();
      drainUntil(time);
    }
  });
}

function syncToTime(time) {
  if (!props.enabled || !danmakuRef.value) return;
  const prev = lastSyncTime.value;
  if (time < prev - 0.35) {
    resetQueueFrom(time);
  } else {
    drainUntil(time);
  }
  lastSyncTime.value = time;
}

function fireNearbyNewItems() {
  if (!props.enabled) return;
  const t = props.currentTime;
  queue.value.forEach((item) => {
    if (firedIds.value.has(item.id)) return;
    if (Math.abs(item.position_seconds - t) <= 1.2) {
      insertDanmu(item);
      firedIds.value.add(item.id);
    }
  });
}

watch(() => props.currentTime, syncToTime);

watch(
  () => props.items,
  (next, prev) => {
    if (!prev?.length) {
      resetQueueFrom(props.currentTime);
      return;
    }
    if (next.length > prev.length) fireNearbyNewItems();
  },
  { deep: true },
);

watch(
  () => props.enabled,
  (on) => {
    if (!on) {
      danmakuRef.value?.hide();
      danmakuRef.value?.stop();
      return;
    }
    danmakuRef.value?.show();
    resetQueueFrom(props.currentTime);
  },
);

watch(
  () => props.paused,
  (paused) => {
    if (!props.enabled) return;
    if (paused) danmakuRef.value?.pause();
    else danmakuRef.value?.play();
  },
);

onMounted(async () => {
  await nextTick();
  if (props.enabled) {
    danmakuRef.value?.play();
    resetQueueFrom(props.currentTime);
  } else {
    danmakuRef.value?.hide();
  }
});

defineExpose({ pushInstant, resetQueueFrom });
</script>

<style scoped>
.danmaku-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 2;
}

.danmaku-canvas {
  width: 100%;
  height: 72%;
}

.danmaku-item {
  font-size: 15px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85), 0 0 6px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

.danmaku-user {
  opacity: 0.75;
  font-weight: 500;
}
</style>
