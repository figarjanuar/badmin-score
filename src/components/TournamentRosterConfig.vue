<template>
  <form class="tournament-roster" @submit.prevent="create">
    <div>
      <h2>{{ isSingles ? 'Players' : 'Fixed pairs' }}</h2>
      <p class="muted">{{ isSingles ? 'Enter at least two players.' : 'Enter at least two pairs. Partners stay together throughout the tournament.' }}</p>
    </div>

    <div class="entries">
      <fieldset v-for="(entry, index) in entries" :id="'tournament-entry-' + entry.id" :key="entry.id" class="entry">
        <legend>{{ entryLabel }} {{ index + 1 }}</legend>
        <div class="entry-fields">
          <label v-for="playerIndex in sideSize" :key="playerIndex">
            <span v-if="!isSingles">{{ category === 'mixed' ? mixedGroups[playerIndex - 1].label : 'Player ' + playerIndex }}</span>
            <input v-model="entry.names[playerIndex - 1]" type="text" class="input" required
              :aria-label="inputLabel(index, playerIndex)" placeholder="Player name" />
          </label>
        </div>
        <button v-if="entries.length > 2" type="button" class="action-button ghost icon remove-entry"
          :aria-label="'Remove ' + entryLabel.toLowerCase() + ' ' + (index + 1)" @click="entries.splice(index, 1)">
          <AppIcon name="close" />
        </button>
      </fieldset>
    </div>

    <button type="button" class="action-button add-entry" @click="addEntry">
      <AppIcon name="plus" /> Add {{ entryLabel.toLowerCase() }}
    </button>

    <p v-if="ready" class="match-count muted" aria-live="polite">
      {{ matchCount }} {{ matchCount === 1 ? 'match' : 'matches' }}<template v-if="byeCount">
        · {{ byeCount }} {{ byeCount === 1 ? 'first-round bye' : 'first-round byes' }}
      </template>
    </p>
    <button type="submit" class="action-button primary" :disabled="!ready">
      {{ mode === 'knockout' ? 'Draw bracket' : 'Create schedule' }}
    </button>
  </form>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { getMatchCategory, mixedGroups } from '../composables/matchCategories.js'
import { createTournament } from '../composables/tournaments.js'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  category: { type: String, required: true },
  mode: { type: String, required: true },
  numCourts: { type: Number, required: true },
})
const emit = defineEmits(['create'])

let nextId = 0
const newEntry = () => ({ id: ++nextId, names: ['', ''] })
const entries = ref([newEntry(), newEntry()])
const sideSize = computed(() => getMatchCategory(props.category).sideSize)
const isSingles = computed(() => sideSize.value === 1)
const entryLabel = computed(() => isSingles.value ? 'Player' : 'Pair')
const roster = computed(() => entries.value.map((entry) => entry.names.slice(0, sideSize.value)))
const ready = computed(() => roster.value.every((entry) => entry.every((name) => name.trim())))
const matchCount = computed(() => {
  const count = entries.value.length
  return props.mode === 'knockout' ? count - 1 : count * (count - 1) / 2
})
const byeCount = computed(() => props.mode === 'knockout'
  ? 2 ** Math.ceil(Math.log2(entries.value.length)) - entries.value.length
  : 0)

function inputLabel(index, playerIndex) {
  if (isSingles.value) return 'Player ' + (index + 1) + ' name'
  const label = props.category === 'mixed' ? mixedGroups[playerIndex - 1].label : 'Player ' + playerIndex
  return 'Pair ' + (index + 1) + ' · ' + label
}

async function addEntry() {
  const entry = newEntry()
  entries.value.push(entry)
  await nextTick()
  document.getElementById('tournament-entry-' + entry.id)?.querySelector('input')?.focus()
}

function create() {
  if (!ready.value) return
  const game = createTournament(props.mode, props.category, props.numCourts, roster.value)
  if (game) emit('create', game)
}
</script>

<style scoped>
.tournament-roster, .entries { display: grid; gap: 12px; }
.tournament-roster h2 { font-size: 20px; }
.tournament-roster .muted { font-size: 14px; }
.entry {
  position: relative;
  min-width: 0;
  padding: 8px 12px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
}
.entry legend { padding-inline: 4px; font-size: 14px; font-weight: 700; }
.entry:has(.remove-entry) { padding-inline-end: 60px; }
.entry-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr)); gap: 8px; }
.entry-fields label { display: grid; gap: 3px; color: var(--text-secondary); font-size: 13px; }
.remove-entry { position: absolute; inset: 8px 8px auto auto; color: var(--danger); }
.add-entry { justify-self: start; }
.match-count { text-align: center; }
</style>
