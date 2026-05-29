<template>
  <div class="settings-page">
    <div class="settings-hero">
      <h1 class="page-title">设置</h1>
      <p class="page-subtitle">管理连接、账号与偏好</p>
    </div>

    <component
      v-for="section in sections"
      :key="section.id"
      :is="section.component"
    />
  </div>
</template>

<script setup>
import { settingsSections } from '@/components/settings';

const sections = settingsSections;
</script>

<style scoped>
.settings-hero {
  margin-bottom: 8px;
}
</style>
