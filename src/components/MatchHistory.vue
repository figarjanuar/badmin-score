<template>
  <section class="match-history">
    <h2 class="section-title">Match history</h2>
    <ul v-if="matches.length" class="matches surface">
      <li v-for="match in matches" :key="match.key" class="match-row">
        <div class="match-info">
          <p class="match-round">
            {{ singleCourtClub ? 'Match ' + match.round : 'Round ' + match.round + ' · Court ' + match.court }}
          </p>
          <div class="match-teams">
            <span>{{ match.home }}</span>
            <span class="match-versus">vs</span>
            <span>{{ match.away }}</span>
          </div>
        </div>
        <MatchSetScores :sets="match.sets" />
      </li>
    </ul>
    <p v-else class="empty-state">No confirmed results yet.</p>
  </section>
</template>

<script setup>
import MatchSetScores from './MatchSetScores.vue'

defineProps({
  matches: { type: Array, required: true },
  singleCourtClub: { type: Boolean, default: false },
})
</script>

<style scoped>
.match-history { display: grid; gap: 12px; min-width: 0; }
.match-history .section-title { display: flex; align-items: center; min-height: var(--size-control); }
.matches { list-style: none; }

.match-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
}

.match-row + .match-row { border-top: 1px solid var(--border); }
.match-info { min-width: 0; }
.match-round { margin-bottom: 4px; color: var(--text-secondary); font-size: 12px; }
.match-teams { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; font-size: 14px; font-weight: 650; }
.match-teams span { overflow-wrap: anywhere; }
.match-versus { color: var(--text-secondary); font-size: 12px; font-weight: 500; }
</style>
