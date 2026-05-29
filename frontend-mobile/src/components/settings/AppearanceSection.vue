<template>
  <SettingsSection
    title="外观设置"
    description="主题、字号与播放界面偏好"
    badge="即将推出"
    disabled
  >
    <div class="card placeholder-card">
      <p>外观设置功能开发中，将支持深色/浅色主题等选项。</p>
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
