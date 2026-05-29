<template>
  <SettingsSection
    title="观看历史"
    description="查看最近观看的剧集与分集"
    badge="即将推出"
    disabled
  >
    <div class="card placeholder-card">
      <p>历史记录功能开发中，将在此展示你的观看记录。</p>
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
