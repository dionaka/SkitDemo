<template>
  <SettingsSection
    title="离线缓存"
    description="下载剧集到本地，无网也能观看"
    badge="即将推出"
    disabled
  >
    <div class="card placeholder-card">
      <p>离线缓存功能开发中，将支持分集下载与存储管理。</p>
    </div>
  </SettingsSection>
</template>

<script setup>
import SettingsSection from './SettingsSection.vue';
</script>

<style scoped>
.placeholder-card p {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
}
</style>
