<template>
  <form class="club-config" @submit.prevent="createMatch">
    <section v-show="step === 1" class="setup-section">
      <p v-if="showRosterErrors && !rosterReady" class="setup-error" role="alert">
        Enter each club name and both players in every pair before continuing.
      </p>
      <div v-for="(club, clubIndex) in clubs" :key="club.id" class="setup-card surface">
        <button
          type="button"
          class="club-toggle"
          :aria-expanded="expandedClubId === club.id"
          :aria-controls="'club-fields-' + club.id"
          @click="expandedClubId = expandedClubId === club.id ? null : club.id"
        >
          <strong>{{ clubLabel(club) }}</strong>
          <span>{{ filledClubPlayers(club) }}/{{ club.teams.length * 2 }} players</span>
          <span aria-hidden="true">{{ expandedClubId === club.id ? '▴' : '▾' }}</span>
        </button>
        <p v-if="showRosterErrors && !clubReady(club)" class="setup-error">
          {{ !club.name.trim() ? 'Enter a club name.' : '' }}
          {{ filledClubPlayers(club) < club.teams.length * 2 ? 'Enter all player names.' : '' }}
        </p>
        <div v-show="expandedClubId === club.id" :id="'club-fields-' + club.id" class="club-fields">
          <div class="setup-row">
            <label class="club-name">
              Club name
              <input class="input" v-model="club.name" :aria-invalid="showRosterErrors && !club.name.trim()" />
            </label>
            <button v-if="clubs.length > 2" type="button" class="action-button ghost icon remove-field" :aria-label="'Remove club ' + (clubIndex + 1)" @click="removeClub(clubIndex)"><AppIcon name="close" /></button>
          </div>

          <div v-for="(team, teamIndex) in club.teams" :key="team.id" class="team-fields">
            <div class="setup-row">
              <strong>Pair {{ teamIndex + 1 }}</strong>
              <button v-if="club.teams.length > 1" type="button" class="action-button ghost icon remove-field" :aria-label="'Remove pair ' + (teamIndex + 1)" @click="removeTeam(club, teamIndex)"><AppIcon name="close" /></button>
            </div>
            <div class="pair-fields">
              <label v-for="(player, playerIndex) in team.players" :key="player.id">
                Player {{ playerIndex + 1 }}
                <input class="input" v-model="player.name" :aria-invalid="showRosterErrors && !player.name.trim()" />
              </label>
            </div>
          </div>

          <button type="button" class="action-button" @click="club.teams.push(newTeam())">+ Add pair</button>
        </div>
      </div>

      <button type="button" class="action-button full-width" @click="addClub">+ Add club</button>
    </section>

    <section v-if="step === 2" class="setup-section schedule-panel">
      <div class="surface schedule-settings">
        <h2 class="section-title">Schedule settings</h2>
        <div class="setting-row">
          <strong>Number of courts</strong>
          <NumberStepper v-model="numCourts" :min="1" :max="6" label="Number of courts"
            decrease-label="Decrease court count" increase-label="Increase court count" />
        </div>
        <div class="setting-row">
          <div class="setting-copy">
            <strong>Number of matches</strong>
            <p class="muted">Changes by 2 to keep the total odd.</p>
          </div>
          <NumberStepper :model-value="matchCount" :min="1" :step="2" label="Number of matches"
            decrease-label="Remove 2 matches" increase-label="Add 2 matches" @update:model-value="setMatchCount" />
        </div>

        <fieldset class="schedule-method">
          <legend>Pairing method</legend>
          <div class="method-options">
            <label v-for="option in methodOptions" :key="option.value" class="method-card">
              <input v-model="method" type="radio" name="schedule-method" :value="option.value" />
              <strong>{{ option.label }}</strong>
              <span>{{ option.description }}</span>
            </label>
          </div>
        </fieldset>
      </div>

      <section v-if="method === 'random'" class="schedule-matches">
        <div class="matches-heading">
          <div>
            <h2 class="section-title">Schedule preview</h2>
            <p class="muted" role="status">{{ matchCount }} {{ matchCount === 1 ? 'match' : 'matches' }} · {{ plannedRounds.length }} {{ plannedRounds.length === 1 ? 'round' : 'rounds' }}</p>
          </div>
          <button type="button" class="action-button" @click="randomize">Shuffle again</button>
        </div>
        <ol class="preview-list surface">
          <li v-for="(match, index) in randomMatches" :key="match.id">
            <div class="match-meta">
              <strong>Match {{ index + 1 }}</strong>
              <span v-if="numCourts > 1" class="muted">{{ matchLocations.get(match.id) }}</span>
            </div>
            <div class="preview-pairs">
              <span>{{ pairLabel(match.home) }}</span>
              <span class="muted">vs</span>
              <span>{{ pairLabel(match.away) }}</span>
            </div>
          </li>
        </ol>
      </section>

      <section v-else class="schedule-matches">
        <div class="matches-heading">
          <div>
            <h2 class="section-title">Set up matches</h2>
            <p class="muted" role="status">{{ readyMatchCount }} of {{ matchCount }} matches ready</p>
          </div>
          <button v-if="matchCount > 1" type="button" class="action-button" :aria-pressed="reordering"
            @click="reordering = !reordering">{{ reordering ? 'Done reordering' : 'Reorder matches' }}</button>
        </div>
        <p v-if="reordering" class="muted reorder-hint">Move matches up or down. Courts and rounds follow this order.</p>
        <ol class="manual-list">
          <li v-for="(match, index) in activeManualMatches" :key="match.id" class="surface manual-match">
            <div class="manual-match-header">
              <div v-if="reordering" class="manual-summary">
                <strong>Match {{ index + 1 }}</strong>
                <span class="muted">{{ manualMatchLabel(match) }}</span>
              </div>
              <button v-else type="button" class="match-toggle" :aria-expanded="expandedMatchId === match.id"
                :aria-controls="'match-fields-' + match.id" @click="toggleMatch(match.id)">
                <span class="manual-summary">
                  <strong>Match {{ index + 1 }}</strong>
                  <span class="muted">{{ manualMatchLabel(match) }}</span>
                  <span v-if="readyMatchCount === matchCount && numCourts > 1" class="match-slot">
                    {{ matchLocations.get(match.id) }}
                  </span>
                </span>
                <AppIcon :name="expandedMatchId === match.id ? 'chevron-up' : 'chevron-down'" />
              </button>
              <div v-if="reordering" class="match-actions">
                <button type="button" class="action-button icon" :disabled="index === 0" @click="moveMatch(index, -1)"
                  :aria-label="'Move match ' + (index + 1) + ' up'"><AppIcon name="arrow-up" /></button>
                <button type="button" class="action-button icon" :disabled="index === matchCount - 1" @click="moveMatch(index, 1)"
                  :aria-label="'Move match ' + (index + 1) + ' down'"><AppIcon name="arrow-down" /></button>
              </div>
            </div>
            <div v-show="expandedMatchId === match.id && !reordering" :id="'match-fields-' + match.id" class="match-pairs">
              <label v-for="side in pairFields" :key="side.key" class="match-field">
                {{ side.label }}
                <select class="input" v-model="match[side.key]" :aria-label="side.label + ' in match ' + (index + 1)">
                  <option :value="null">Select a pair</option>
                  <optgroup v-for="club in clubs" :key="club.id" :label="clubLabel(club)">
                    <option v-for="(team, teamIndex) in club.teams" :key="team.id" :value="team.id"
                      :disabled="club.id === teams.get(match[side.other])?.club.id">
                      {{ teamLabel(team, teamIndex) }}
                    </option>
                  </optgroup>
                </select>
              </label>
            </div>
          </li>
        </ol>
      </section>

      <p v-if="validationMessage" class="setup-error" aria-live="polite">{{ validationMessage }}</p>
      <div class="schedule-footer">
        <button type="button" class="action-button" aria-label="Back to clubs and pairs" @click="$emit('back')">Back</button>
        <button type="submit" class="action-button primary" :disabled="!!validationMessage">Create session</button>
      </div>
    </section>
  </form>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import NumberStepper from './NumberStepper.vue'
import { createClubGame, groupClubMatches, randomClubMatches } from '../composables/clubMatches.js'

const emit = defineEmits(['back', 'create'])
const props = defineProps({
  step: { type: Number, required: true },
})
const clubs = ref([])
const expandedClubId = ref(null)
const showRosterErrors = ref(false)
const matchCount = ref(3)
const manualMatches = ref([])
const randomMatches = ref([])
const expandedMatchId = ref(null)
const reordering = ref(false)
const methodOptions = [
  { value: 'random', label: 'Random', description: 'Automatically schedule pairs from different clubs.' },
  { value: 'manual', label: 'Manual', description: 'Choose each pairing and set the match order.' },
]
const pairFields = [
  { key: 'home', other: 'away', label: 'First pair' },
  { key: 'away', other: 'home', label: 'Second pair' },
]
const method = ref('random')
const numCourts = ref(1)
let nextId = 0

function newTeam() {
  return {
    id: ++nextId,
    players: [{ id: ++nextId, name: '' }, { id: ++nextId, name: '' }],
  }
}

function addClub() {
  const club = { id: ++nextId, name: '', teams: [newTeam()] }
  clubs.value.push(club)
  expandedClubId.value = club.id
}

function setMatchCount(count) {
  matchCount.value = count
  // Keep the manual draft so reducing the count can be undone by increasing it again.
  while (manualMatches.value.length < count) {
    manualMatches.value.push({ id: ++nextId, home: null, away: null })
  }
  if (expandedMatchId.value !== null && !manualMatches.value.slice(0, count).some((match) => match.id === expandedMatchId.value)) {
    expandedMatchId.value = manualMatches.value[0].id
  }
  if (count === 1) reordering.value = false
}

addClub()
addClub()
expandedClubId.value = clubs.value[0].id
setMatchCount(matchCount.value)
expandedMatchId.value = manualMatches.value[0].id

const teams = computed(() => {
  const entries = clubs.value.flatMap((club) => club.teams.map((team) => [team.id, { club, team }]))
  return new Map(entries)
})

const activeManualMatches = computed(() => manualMatches.value.slice(0, matchCount.value))
const matches = computed(() => method.value === 'random' ? randomMatches.value : activeManualMatches.value)
const readyMatchCount = computed(() => activeManualMatches.value.filter(isMatchReady).length)
const plannedRounds = computed(() => groupClubMatches(matches.value, numCourts.value))
const matchLocations = computed(() => new Map(plannedRounds.value.flatMap((round, roundIndex) =>
  round.map((match, courtIndex) => [match.id, `Round ${roundIndex + 1} · Court ${courtIndex + 1}`])
)))

const rosterReady = computed(() => clubs.value.length >= 2 && clubs.value.every(clubReady))

function filledClubPlayers(club) {
  return club.teams.flatMap((team) => team.players).filter((player) => player.name.trim()).length
}

function clubReady(club) {
  return !!club.name.trim() && filledClubPlayers(club) === club.teams.length * 2
}

function validateRoster() {
  if (rosterReady.value) return true
  showRosterErrors.value = true
  const firstIncomplete = clubs.value.find((club) => !clubReady(club))
  if (firstIncomplete) {
    expandedClubId.value = firstIncomplete.id
    nextTick(() => document.getElementById('club-fields-' + firstIncomplete.id)?.querySelector('[aria-invalid="true"]')?.focus())
  }
  return false
}

defineExpose({ validateRoster })

const validationMessage = computed(() => {
  if (!rosterReady.value) return 'Enter each club name and both players in every pair.'
  if (method.value === 'manual' && readyMatchCount.value !== matchCount.value) {
    return 'Choose two pairs from different clubs for each match.'
  }
  if (matches.value.length !== matchCount.value) return 'The schedule is not ready yet.'
  return ''
})

watch([rosterReady, teams, numCourts, matchCount], () => {
  if (rosterReady.value) randomize()
}, { immediate: true })

function isMatchReady({ home, away }) {
  const first = teams.value.get(home)
  const second = teams.value.get(away)
  return first && second && first.club.id !== second.club.id
}

function clubLabel(club) {
  return club.name.trim() || 'Club ' + (clubs.value.indexOf(club) + 1)
}

function teamLabel(team, index) {
  const names = team.players.map((player) => player.name.trim()).filter(Boolean)
  const club = teams.value.get(team.id).club
  return [clubLabel(club), 'Pair ' + (index + 1), names.join(' & ')].filter(Boolean).join(' · ')
}

function pairLabel(id) {
  const entry = teams.value.get(id)
  if (!entry) return ''
  return `${clubLabel(entry.club)} · ${entry.team.players.map((player) => player.name.trim()).join(' & ')}`
}

function manualMatchLabel(match) {
  if (!isMatchReady(match)) return 'Choose pairs'
  return [pairLabel(match.home), pairLabel(match.away)].join(' vs ')
}

function toggleMatch(id) {
  expandedMatchId.value = expandedMatchId.value === id ? null : id
}

function clearRemovedTeams() {
  for (const match of manualMatches.value) {
    if (!teams.value.has(match.home)) match.home = null
    if (!teams.value.has(match.away)) match.away = null
  }
}

function removeClub(index) {
  const [removed] = clubs.value.splice(index, 1)
  if (expandedClubId.value === removed.id) {
    expandedClubId.value = clubs.value[Math.min(index, clubs.value.length - 1)].id
  }
  clearRemovedTeams()
}

function removeTeam(club, index) {
  club.teams.splice(index, 1)
  clearRemovedTeams()
}

function moveMatch(index, delta) {
  const [match] = manualMatches.value.splice(index, 1)
  manualMatches.value.splice(index + delta, 0, match)
}

function randomize() {
  randomMatches.value = randomClubMatches(clubs.value, matchCount.value, numCourts.value)
    .map((match, index) => ({ ...match, id: index + 1 }))
}

function createMatch() {
  if (props.step !== 2 || validationMessage.value) return
  emit('create', createClubGame(clubs.value, plannedRounds.value, teams.value, numCourts.value))
}
</script>

<style scoped>
.club-config,
.setup-section {
  display: grid;
  gap: 12px;
}

.setup-section { margin-bottom: 8px; }

.setup-card {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 14px;
}

.club-toggle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  min-height: var(--size-control);
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}

.club-toggle strong { overflow-wrap: anywhere; }

.club-toggle span {
  color: var(--text-secondary);
  font-size: 13px;
}

.club-fields {
  display: grid;
  gap: 12px;
}

.setup-row,
.pair-fields {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setup-row { justify-content: space-between; }

.pair-fields > label {
  flex: 1;
  min-width: 0;
}


.pair-fields label {
  font-size: 13px;
  color: var(--text-secondary);
}

.pair-fields input {
  margin-top: 4px;
  font-size: 16px;
}

.team-fields {
  display: grid;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.schedule-panel { gap: 20px; }

.schedule-settings {
  display: grid;
  gap: 12px;
  padding: clamp(14px, 4vw, 24px);
}

.setting-row, .matches-heading, .match-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
}

.setting-copy { min-width: 0; }
.setting-row > .stepper { flex-shrink: 0; }
.setting-row + .setting-row { padding-top: 12px; border-top: 1px solid var(--border); }
.setting-row p, .matches-heading p { margin-top: 2px; font-size: 14px; }
.schedule-method { min-width: 0; margin-top: 4px; border: 0; }
.schedule-method legend { margin-bottom: 8px; font-weight: 700; }

.method-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.method-card {
  position: relative;
  display: grid;
  align-content: start;
  gap: 4px;
  min-height: var(--size-control);
  padding: 10px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-control);
  background: var(--input-bg);
}
.method-card span { color: var(--text-secondary); font-size: 13px; }
.method-card:has(input:checked) { border-color: var(--primary); background: var(--primary-bg); }
.method-card:has(input:focus-visible) { outline: 2px solid var(--primary); outline-offset: 2px; }
.method-card input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }

.schedule-matches, .manual-list { display: grid; gap: 10px; }
.matches-heading { flex-wrap: wrap; }
.preview-list, .manual-list { min-width: 0; list-style: none; }
.preview-list li { display: grid; gap: 4px; padding: 10px 14px; }
.preview-list li + li { border-top: 1px solid var(--border); }
.match-meta { flex-wrap: wrap; font-size: 13px; }
.preview-pairs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.manual-match-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.match-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: var(--size-control);
  padding: 10px 14px;
  border: 0;
  border-radius: var(--radius-panel);
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}
.manual-summary { display: grid; gap: 2px; min-width: 0; }
.manual-summary .muted { font-size: 13px; overflow-wrap: anywhere; }
.match-slot { color: var(--primary); font-size: 13px; }
.manual-match-header > .manual-summary { padding: 10px 0 10px 14px; }
.match-actions { display: flex; gap: 8px; padding: 6px; }
.reorder-hint { font-size: 14px; }
.match-pairs { display: grid; gap: 12px; padding: 12px 14px 14px; border-top: 1px solid var(--border); }
.match-field { display: grid; gap: 4px; font-size: 14px; }
.schedule-footer { display: flex; gap: 8px; justify-content: flex-end; }

.full-width { width: 100%; }
.remove-field { color: var(--danger); }

.setup-error {
  color: var(--danger);
  font-size: 13px;
}

.club-name { display: grid; flex: 1; min-width: 0; gap: 4px; font-size: 14px; }
.setup-section [aria-invalid="true"] { border-color: var(--danger); }
</style>
