<template>
  <slot />
</template>

<script setup>
import { useSkinCssVars } from '../composables/useSkinCssVars';

useSkinCssVars();
</script>
