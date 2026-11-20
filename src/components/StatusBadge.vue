<template>
  <span class="status-badge" :data-tone="tone">
    <AppIcon :name="icons[tone] || icons.neutral" />
    <slot />
  </span>
</template>

<script setup>
import AppIcon from './AppIcon.vue'

defineProps({ tone: { type: String, default: 'neutral' } })

const icons = { neutral: 'minus', active: 'clock', success: 'check' }
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--tag-bg);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 750;
  line-height: 1.2;
  white-space: nowrap;
}

.status-badge .app-icon {
  width: 15px;
  height: 15px;
}

[data-tone="active"] {
  border-color: var(--yellow-border);
  background: var(--yellow-bg);
  color: var(--yellow);
}

[data-tone="success"] {
  border-color: var(--green-border);
  background: var(--green-bg);
  color: var(--green);
}
</style>
