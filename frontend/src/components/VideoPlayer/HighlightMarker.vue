<template>
  <div
    class="marker"
    :style="{ left: position + '%' }"
    @click.stop="$emit('click')"
    @mouseenter="hover = true"
    @mouseleave="hover = false"
  >
    <div class="dot" :class="highlight.category" />
    <div v-if="hover" class="tooltip">{{ highlight.title }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  highlight: Object,
  duration: Number,
});

defineEmits(['click']);

const hover = ref(false);
const position = computed(() =>
  props.duration ? (props.highlight.timestamp / props.duration) * 100 : 0
);
</script>

<style scoped>
.marker { position: absolute; top: 50%; transform: translate(-50%, -50%); z-index: 2; }
.dot {
  width: 12px; height: 12px; border-radius: 50%; cursor: pointer;
  border: 2px solid #fff; transition: transform 0.2s;
}
.dot:hover { transform: scale(1.4); }
.dot.conflict { background: #ff4757; }
.dot.reversal { background: #ffa502; }
.dot.sweet { background: #ff6b81; }
.dot.scene { background: #5352ed; }
.tooltip {
  position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,0.85); color: #fff; padding: 4px 10px;
  border-radius: 4px; font-size: 12px; white-space: nowrap;
}
</style>
