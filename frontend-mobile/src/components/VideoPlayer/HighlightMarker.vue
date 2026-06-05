<template>
  <div
    class="marker"
    :style="{ left: position + '%' }"
    @click.stop="$emit('click')"
  >
    <div class="dot" :style="{ background: dotColor }" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getCategoryColor } from '@/config/highlightCategories';

const props = defineProps({
  highlight: Object,
  duration: Number,
});

defineEmits(['click']);

const position = computed(() =>
  props.duration ? (props.highlight.timestamp / props.duration) * 100 : 0
);

const dotColor = computed(() => getCategoryColor(props.highlight?.category));
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
</style>
