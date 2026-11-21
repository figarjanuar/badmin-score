<template>
  <section class="knockout-bracket" :aria-labelledby="headingId">
    <h2 :id="headingId" class="section-title">Bracket</h2>
    <p v-if="champion" class="champion surface">
      <AppIcon name="check" /> Champion <strong>{{ names.get(champion) }}</strong>
    </p>
    <div class="bracket-stages" tabindex="0" role="group" aria-label="Bracket stages">
      <section v-for="(stage, index) in stages" :key="stage.stage" class="bracket-stage">
        <h3>{{ stage.label }}</h3>
        <ol class="bracket-matches">
          <li v-for="match in stage.matches" :key="match.slot" class="bracket-match surface">
            <div class="match-meta">
              <span>Match {{ match.slot + 1 }}</span>
              <span v-if="match.bye" class="bye-label">Bye</span>
              <span v-else-if="match.court">Round {{ match.round }} · Court {{ match.court.court }}</span>
              <span v-else>Awaiting stage</span>
            </div>
            <div v-for="(entry, side) in [match.entry1, match.entry2]" :key="side" class="bracket-side"
              :class="{ 'bracket-winner': entry !== null && entry === match.winner }">
              <span>{{ entryLabel(entry, stage, index, match.slot, side) }}</span>
              <span v-if="entry !== null && entry === match.winner" class="winner-label">{{ match.bye ? 'Advances' : 'Winner' }}</span>
            </div>
            <button v-if="interactive && match.court" type="button" class="action-button view-match"
              :aria-label="'View ' + stage.label + ' match ' + (match.slot + 1)"
              @click="$emit('view-match', { round: match.round, court: match.court.court })">
              View match <AppIcon name="arrow" />
            </button>
          </li>
        </ol>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, useId } from 'vue'
import AppIcon from './AppIcon.vue'
import { getKnockoutBracket, getTournamentEntryNames } from '../composables/tournaments.js'

const props = defineProps({
  game: { type: Object, required: true },
  interactive: { type: Boolean, default: false },
})
defineEmits(['view-match'])

const headingId = useId()
const stages = computed(() => getKnockoutBracket(props.game))
const names = computed(() => getTournamentEntryNames(props.game))
const champion = computed(() => stages.value.at(-1)?.matches[0]?.winner)

function entryLabel(entryId, stage, index, slot, side) {
  if (entryId !== null) return names.value.get(entryId)
  if (stage.stage === 1) return 'Bye'
  return 'Winner of ' + stages.value[index - 1].label + ' match ' + (slot * 2 + side + 1)
}
</script>

<style scoped>
.knockout-bracket { display: grid; gap: 12px; min-width: 0; }
.champion { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 16px; color: var(--primary); }
.champion strong { overflow-wrap: anywhere; }
.bracket-stages {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(min(100%, 16rem), 1fr);
  align-items: start;
  gap: 12px;
  min-width: 0;
  overflow-x: auto;
  padding: 2px 2px 12px;
}
.bracket-stage, .bracket-matches { display: grid; gap: 8px; min-width: 0; }
.bracket-stage h3 { font-size: 16px; }
.bracket-matches { list-style: none; }
.bracket-match { display: grid; min-width: 0; }
.match-meta, .bracket-side { display: flex; justify-content: space-between; gap: 8px; padding: 8px 12px; }
.match-meta { color: var(--text-secondary); font-size: 12px; }
.bracket-side { align-items: start; border-top: 1px solid var(--border); font-size: 14px; }
.bracket-side > span:first-child { min-width: 0; overflow-wrap: anywhere; }
.bracket-winner, .bye-label { color: var(--primary); }
.winner-label { font-size: 12px; font-weight: 700; white-space: nowrap; }
.view-match { justify-content: space-between; margin: 8px; text-align: left; }
</style>
