<template>
  <div
    class="marker"
    :style="{ left: position + '%' }"
    @click.stop="$emit('click')"
  >
    <div class="dot" :class="highlight.category" />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  highlight: Object,
  duration: Number,
});

defineEmits(['click']);

const position = computed(() =>
  props.duration ? (props.highlight.timestamp / props.duration) * 100 : 0
);
</script>

<style scoped>
.marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
}

.dot.conflict { background: #ff4757; }
.dot.reversal { background: #ffa502; }
.dot.sweet { background: #ff6b81; }
.dot.scene { background: #5352ed; }
</style>
