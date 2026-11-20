<template>
  <div class="stepper" role="group" :aria-label="label">
    <button type="button" class="action-button icon" :aria-label="decreaseLabel" :title="decreaseLabel"
      :disabled="value - step < min" @click="value -= step"><AppIcon name="minus" /></button>
    <output class="stepper-value" :aria-label="label">{{ value }}</output>
    <button type="button" class="action-button icon" :aria-label="increaseLabel" :title="increaseLabel"
      :disabled="value + step > max" @click="value += step"><AppIcon name="plus" /></button>
  </div>
</template>

<script setup>
import AppIcon from './AppIcon.vue'

const value = defineModel({ type: Number, required: true })
defineProps({
  label: { type: String, required: true },
  decreaseLabel: { type: String, required: true },
  increaseLabel: { type: String, required: true },
  min: { type: Number, required: true },
  max: { type: Number, default: Infinity },
  step: { type: Number, default: 1 },
})
</script>

<style scoped>
.stepper { display: flex; gap: 8px; align-items: center; }
.stepper-value {
  min-width: 32px;
  text-align: center;
  font: 700 34px / 1 var(--font-display);
  font-variant-numeric: tabular-nums;
}
</style>
