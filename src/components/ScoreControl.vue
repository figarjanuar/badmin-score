<template>
  <div class="sb-score-controls">
    <strong v-if="locked" class="final-score">{{ score ?? '—' }}</strong>
    <input v-else-if="editing" ref="input" v-model.number="draft" type="number" min="0" inputmode="numeric"
      class="sb-score-input" :aria-label="'Score for ' + pair"
      @blur="commit()" @keydown.enter.prevent="commit(true)" @keydown.esc.prevent="close(true)" />
    <button v-else :id="buttonId" ref="trigger" type="button" class="sb-score"
      :aria-label="'Edit score for ' + pair + ', ' + (score ?? 'empty')" @click="start">{{ score ?? '—' }}</button>

    <template v-if="!locked">
      <button type="button" class="action-button icon sb-minus" :disabled="!score"
        :aria-label="'Subtract a point from ' + pair" @click="$emit('adjust', -1)"><AppIcon name="minus" /></button>
      <button type="button" class="action-button primary icon sb-plus"
        :aria-label="'Add a point to ' + pair" @click="$emit('adjust', 1)"><AppIcon name="plus" /></button>
    </template>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  score: { type: Number, default: null },
  pair: { type: String, required: true },
  buttonId: { type: String, required: true },
  roundNumber: { type: Number, required: true },
  locked: { type: Boolean, required: true },
})
const emit = defineEmits(['adjust', 'score'])
const editing = ref(false)
const draft = ref('')
const input = ref(null)
const trigger = ref(null)

watch(() => props.locked, (locked) => {
  if (locked) editing.value = false
})

function start() {
  draft.value = props.score ?? ''
  editing.value = true
  nextTick(() => input.value?.focus())
}

function close(restoreFocus) {
  editing.value = false
  if (restoreFocus) nextTick(() => trigger.value?.focus())
}

function commit(restoreFocus = false) {
  if (!editing.value) return
  close(restoreFocus)
  if (!props.locked) emit('score', draft.value, props.roundNumber)
}
</script>

<style scoped>
.sb-score-controls {
  display: grid;
  flex: 1;
  grid-template-columns: var(--size-control) minmax(var(--size-control), 1fr);
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.sb-score, .sb-score-input, .final-score {
  grid-column: 1 / -1;
  grid-row: 1;
  min-width: 0;
  width: 100%;
  min-height: 63px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  color: var(--text-primary);
  font: 700 clamp(48px, 8vw, 66px) / 0.95 var(--font-display);
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.sb-score { background: transparent; cursor: pointer; touch-action: manipulation; }
.sb-score:hover { background: var(--surface-raised); }
.sb-score-input { border-color: var(--primary); background: var(--input-bg); }
.final-score { display: grid; place-items: center; }
.sb-plus { width: 100%; }

@container (min-width: 375px) {
  .sb-score-controls { grid-template-columns: var(--size-control) minmax(50px, 1fr) var(--size-control); }
  .sb-score, .sb-score-input { grid-column: 2; }
  .sb-minus, .sb-plus { grid-row: 1; }
  .sb-minus { grid-column: 1; }
  .sb-plus { grid-column: 3; }
}
</style>
