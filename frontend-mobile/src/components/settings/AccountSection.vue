<template>
  <SettingsSection
    title="账号登录"
    description="登录后同步观看进度与收藏"
    badge="即将推出"
    disabled
  >
    <div class="card placeholder-card">
      <p>用户登录功能开发中，支持账号体系与多端同步。</p>
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
