<template>
  <div class="match-set-scores">
    <div v-for="(set, index) in sets" :key="index" class="set-score">
      <span v-if="sets.length > 1" class="set-label">Set {{ index + 1 }}</span>
      <span v-if="hasSetScore(set)" class="set-points">
        <b class="home-score">{{ set.score1 ?? '—' }}</b>
        <span>–</span>
        <b class="away-score">{{ set.score2 ?? '—' }}</b>
      </span>
      <span v-else>—</span>
    </div>
  </div>
</template>

<script setup>
import { hasSetScore } from '../composables/matchScores.js'

defineProps({
  sets: { type: Array, required: true },
})
</script>

<style scoped>
.match-set-scores {
  flex-shrink: 0;
  display: grid;
  gap: 4px;
  color: var(--text-secondary);
}

.set-score {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: 700;
}

.set-label { font-size: 11px; }

.set-points {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 18px;
}

.home-score { color: var(--green); }
.away-score { color: var(--primary); }
</style>
