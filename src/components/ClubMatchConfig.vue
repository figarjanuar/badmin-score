<template>
  <form class="club-config" @submit.prevent="createMatch">
    <section v-show="step === 1" class="setup-section">
      <div v-for="(club, clubIndex) in clubs" :key="club.id" class="setup-card">
        <button
          type="button"
          class="club-toggle"
          :aria-expanded="expandedClubId === club.id"
          :aria-controls="'club-fields-' + club.id"
          @click="expandedClubId = expandedClubId === club.id ? null : club.id"
        >
          <strong>{{ clubLabel(club) }}</strong>
          <span>{{ club.teams.length }} pasangan</span>
          <span aria-hidden="true">{{ expandedClubId === club.id ? '▴' : '▾' }}</span>
        </button>
        <div v-show="expandedClubId === club.id" :id="'club-fields-' + club.id" class="club-fields">
          <div class="setup-row">
            <input v-model="club.name" :aria-label="'Nama klub ' + (clubIndex + 1)" placeholder="Nama klub" />
            <button v-if="clubs.length > 2" type="button" :aria-label="'Hapus klub ' + (clubIndex + 1)" @click="removeClub(clubIndex)">✕</button>
          </div>

          <div v-for="(team, teamIndex) in club.teams" :key="team.id" class="team-fields">
            <div class="setup-row">
              <strong>Team {{ teamIndex + 1 }}</strong>
              <button v-if="club.teams.length > 1" type="button" :aria-label="'Hapus Team ' + (teamIndex + 1)" @click="removeTeam(club, teamIndex)">✕</button>
            </div>
            <div class="pair-fields">
              <label v-for="(player, playerIndex) in team.players" :key="player.id">
                Pemain {{ playerIndex + 1 }}
                <input v-model="player.name" :placeholder="'Nama pemain ' + (playerIndex + 1)" />
              </label>
            </div>
          </div>

          <button type="button" @click="club.teams.push(newTeam())">+ Tambah Pasangan</button>
        </div>
      </div>

      <button type="button" class="full-width" @click="addClub">+ Tambah Klub</button>
    </section>

    <section v-show="step === 2" class="setup-section">
      <label class="setup-row court-count">
        <strong>Jumlah Lapangan</strong>
        <select v-model.number="numCourts">
          <option v-for="count in 6" :key="count" :value="count">{{ count }}</option>
        </select>
      </label>

      <fieldset class="schedule-options">
        <legend>Cara Pilih Lawan</legend>
        <label><input v-model="method" type="radio" name="schedule-method" value="random" /> Random</label>
        <label><input v-model="method" type="radio" name="schedule-method" value="manual" /> Manual</label>
      </fieldset>

      <div class="setup-row">
        <p aria-live="polite"><strong>{{ matches.length }} match</strong> · Total harus ganjil</p>
        <button type="button" @click="addMatch">+ Tambah Match</button>
      </div>
      <button v-if="method === 'random'" type="button" class="full-width" :disabled="!rosterReady" @click="randomize">
        Acak Lawan &amp; Urutan
      </button>

      <fieldset v-for="(match, index) in matches" :key="match.id" class="setup-card">
        <legend>Match {{ index + 1 }}</legend>
        <p v-if="numCourts > 1" class="match-location">{{ matchLocations.get(match.id) }}</p>
        <div class="match-pairs">
          <select v-model="match.home" :aria-label="'Pasangan pertama di match ' + (index + 1)">
            <option :value="null">Pilih pasangan pertama</option>
            <optgroup v-for="club in clubs" :key="club.id" :label="clubLabel(club)">
              <option v-for="(team, teamIndex) in club.teams" :key="team.id" :value="team.id" :disabled="club.id === teams.get(match.away)?.club.id">
                {{ teamLabel(team, teamIndex) }}
              </option>
            </optgroup>
          </select>
          <select v-model="match.away" :aria-label="'Pasangan kedua di match ' + (index + 1)">
            <option :value="null">Pilih pasangan kedua</option>
            <optgroup v-for="club in clubs" :key="club.id" :label="clubLabel(club)">
              <option v-for="(team, teamIndex) in club.teams" :key="team.id" :value="team.id" :disabled="club.id === teams.get(match.home)?.club.id">
                {{ teamLabel(team, teamIndex) }}
              </option>
            </optgroup>
          </select>
        </div>
        <div class="match-actions">
          <button type="button" :disabled="index === 0" @click="moveMatch(index, -1)" :aria-label="'Naikkan match ' + (index + 1)">↑</button>
          <button type="button" :disabled="index === matches.length - 1" @click="moveMatch(index, 1)" :aria-label="'Turunkan match ' + (index + 1)">↓</button>
          <button type="button" :disabled="matches.length === 1" @click="matches.splice(index, 1)" :aria-label="'Hapus match ' + (index + 1)">Hapus</button>
        </div>
      </fieldset>
    </section>

    <template v-if="step === 2">
      <p v-if="validationMessage" class="setup-error" aria-live="polite">{{ validationMessage }}</p>
      <button type="submit" class="create-button" :disabled="!!validationMessage">Buat Pertandingan</button>
    </template>
  </form>
</template>

<script setup>
import { computed, ref } from 'vue'
import { createClubGame, groupClubMatches, randomClubMatches } from '../composables/clubMatches.js'

const emit = defineEmits(['create'])
const props = defineProps({
  step: { type: Number, required: true },
})
const clubs = ref([])
const expandedClubId = ref(null)
const matches = ref([])
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

function addMatch() {
  matches.value.push({ id: ++nextId, home: null, away: null })
}

addClub()
addClub()
expandedClubId.value = clubs.value[0].id
addMatch()
addMatch()
addMatch()

const teams = computed(() => {
  const entries = clubs.value.flatMap((club) => club.teams.map((team) => [team.id, { club, team }]))
  return new Map(entries)
})

const plannedRounds = computed(() => groupClubMatches(matches.value, numCourts.value))
const matchLocations = computed(() => new Map(plannedRounds.value.flatMap((round, roundIndex) =>
  round.map((match, courtIndex) => [match.id, `Ronde ${roundIndex + 1} · Lapangan ${courtIndex + 1}`])
)))

const rosterReady = computed(() => clubs.value.length >= 2 && clubs.value.every((club) =>
  club.name.trim() && club.teams.length && club.teams.every((team) =>
    team.players.every((player) => player.name.trim())
  )
))

const validationMessage = computed(() => {
  if (matches.value.length % 2 === 0) return 'Tambah atau hapus satu match supaya totalnya ganjil.'
  if (!rosterReady.value) return 'Isi nama klub dan kedua pemain di setiap pasangan.'
  if (matches.value.some(({ home, away }) => {
    const first = teams.value.get(home)
    const second = teams.value.get(away)
    return !first || !second || first.club.id === second.club.id
  })) return 'Isi setiap match dengan dua pasangan dari klub berbeda.'
  return ''
})

function clubLabel(club) {
  return club.name.trim() || 'Klub ' + (clubs.value.indexOf(club) + 1)
}

function teamLabel(team, index) {
  const names = team.players.map((player) => player.name.trim()).filter(Boolean)
  const club = teams.value.get(team.id).club
  return [clubLabel(club), 'Team ' + (index + 1), names.join(' & ')].filter(Boolean).join(' · ')
}

function clearRemovedTeams() {
  for (const match of matches.value) {
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
  const [match] = matches.value.splice(index, 1)
  matches.value.splice(index + delta, 0, match)
}

function randomize() {
  const schedule = randomClubMatches(clubs.value, matches.value.length, numCourts.value)
  matches.value.forEach((match, index) => Object.assign(match, schedule[index]))
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
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
}

.club-toggle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  border: 0;
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

legend {
  padding-inline: 4px;
  font-size: 14px;
  font-weight: 600;
}

.setup-row,
.pair-fields {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setup-row { justify-content: space-between; }

.court-count select {
  width: auto;
  min-width: 64px;
}

.setup-row > input,
.pair-fields > label {
  flex: 1;
  min-width: 0;
}

select,
input:not([type="radio"]) {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--text-primary);
  font: inherit;
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

.schedule-options {
  display: flex;
  gap: 16px;
  border: 0;
}

.schedule-options legend { margin-bottom: 4px; padding: 0; }
.schedule-options input { accent-color: var(--primary); }

.match-pairs {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.match-location {
  font-size: 13px;
  color: var(--text-secondary);
}

.match-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

button {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.full-width { width: 100%; }

.create-button {
  padding: 12px;
  border: 0;
  background: var(--primary);
  color: #fff;
  font-size: 16px;
}

.setup-error {
  color: var(--danger);
  font-size: 13px;
}
</style>
