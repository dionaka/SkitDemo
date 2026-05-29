<template>
  <section class="settings-section" :class="{ disabled }">
    <header v-if="title || $slots.header" class="section-head">
      <slot name="header">
        <div>
          <h2 class="section-title">{{ title }}</h2>
          <p v-if="description" class="section-desc">{{ description }}</p>
        </div>
        <span v-if="badge" class="section-badge">{{ badge }}</span>
      </slot>
    </header>
    <div class="section-body">
      <slot />
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  badge: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
});
</script>

<style scoped>
.settings-section {
  margin-bottom: 20px;
}

.settings-section.disabled .section-body {
  opacity: 0.55;
  pointer-events: none;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.section-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
  line-height: 1.5;
}

.section-badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: 20px;
}

.section-body {
  transition: opacity 0.2s;
}
</style>
