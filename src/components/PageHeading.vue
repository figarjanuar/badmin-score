<template>
  <header class="page-heading">
    <div class="heading-copy">
      <p v-if="label" class="heading-label">{{ label }}</p>
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="description" class="heading-description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="heading-actions"><slot name="actions" /></div>
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  label: { type: String, default: '' },
  description: { type: String, default: '' },
})
</script>

<style scoped>
.page-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 16px 24px;
  margin-bottom: clamp(20px, 3vw, 32px);
}

.heading-copy { min-width: 0; }
.heading-label {
  margin-bottom: 7px;
  color: var(--primary);
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.heading-description { color: var(--text-secondary); margin-top: 8px; }
.heading-actions { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
