<template>
  <div class="page page-narrow config">
    <PageHeading title="New session" />

    <nav class="config-steps surface" aria-label="Setup steps">
      <button
        v-for="(label, index) in steps"
        :key="index"
        type="button"
        class="config-step"
        :aria-current="step === index ? 'step' : undefined"
        @click="showStep(index)"
      >
        <span class="step-number">{{ index + 1 }}</span>
        {{ label }}
      </button>
    </nav>

    <section v-show="step === 0" class="config-panel surface">
      <fieldset class="field mode-field">
        <legend class="field-label">Choose a mode</legend>
        <label v-for="mode in gameModes" :key="mode.id" class="mode-option">
          <input v-model="gameMode" type="radio" name="game-mode" :value="mode.id" />
          <span>
            <strong>{{ mode.title }}</strong>
            <small>{{ mode.description }}</small>
          </span>
        </label>
      </fieldset>

      <div class="field">
        <label for="match-category" class="field-label">Match category</label>
        <select id="match-category" v-model="category" class="input">
          <option v-for="option in matchCategories" :key="option.id" :value="option.id">{{ option.label }}</option>
        </select>
      </div>

      <div class="field">
        <label for="event-name" class="field-label">Session name <span class="optional">(optional)</span></label>
        <input
          id="event-name"
          v-model="eventName"
          type="text"
          class="input"
          placeholder="e.g. Friday badminton"
        />
      </div>
    </section>

    <ClubMatchConfig ref="clubConfig" v-show="gameMode === 'club' && step > 0" :step="step"
      :category="category" @back="showStep(1)" @create="saveGame" />

    <section v-show="gameMode === 'rotation' && step === 1" class="config-panel surface">
      <!-- Court count -->
      <div class="field">
        <p class="field-label">Number of courts</p>
        <NumberStepper v-model="numCourts" :min="1" :max="6" label="Number of courts"
          decrease-label="Decrease court count" increase-label="Increase court count" />
      </div>

      <!-- Rotation mode -->
      <div v-if="category === 'doubles'" class="field">
        <p class="field-label">Rotation mode</p>
        <div class="mode-toggle">
          <button
            class="action-button mode-btn"
            :class="{ active: rotationMode === 'americano' }"
            :aria-pressed="rotationMode === 'americano'"
            @click="rotationMode = 'americano'"
          >
            <span class="mode-label">Quick rotation</span>
          </button>
          <button
            class="action-button mode-btn"
            :class="{ active: rotationMode === 'completePartner' }"
            :aria-pressed="rotationMode === 'completePartner'"
            @click="rotationMode = 'completePartner'"
          >
            <span class="mode-label">Full partner rotation</span>
          </button>
        </div>
        <p class="mode-desc">
          {{ rotationMode === 'americano'
            ? 'Fewer rounds. Every player meets the others as a partner or opponent.'
            : 'More rounds so every player partners with everyone else.' }}
        </p>
      </div>
    </section>

    <section v-show="gameMode === 'rotation' && step === 2" class="config-panel surface">
      <!-- Player names -->
      <div class="field">
        <div class="field-row">
          <h2 class="field-label">Player roster</h2>
          <button type="button" class="action-button" :disabled="filledPlayers.length === players.length" @click="fillExampleNames">
            Fill sample names
          </button>
        </div>
        <p class="player-progress" aria-live="polite">
          <template v-if="category === 'mixed'">
            {{ mixedRosterCounts[0] }} men · {{ mixedRosterCounts[1] }} women · {{ numCourts * 2 }} of each required
          </template>
          <template v-else>
            {{ filledPlayers.length }} entered · {{ effectiveMinPlayers }} required for {{ numCourts }} {{ numCourts === 1 ? 'court' : 'courts' }}
          </template>
        </p>
        <details class="paste-players">
          <summary>Paste a list of names</summary>
          <label for="paste-players">One name per line</label>
          <textarea id="paste-players" v-model="namesToPaste" class="input" rows="3"></textarea>
          <button type="button" class="action-button" :disabled="!namesToPaste.trim()" @click="pasteNames">
            Add names
          </button>
        </details>

        <div class="player-list">
          <div
            v-for="(player, idx) in players"
            :key="player.id"
            class="player-row"
            :class="{ 'mixed-player-row': category === 'mixed' }"
          >
            <span class="player-num" aria-hidden="true">{{ idx + 1 }}</span>
            <input
              v-model="player.name"
              type="text"
              class="input player-input"
              :aria-label="'Player name ' + (idx + 1)"
              :placeholder="'Player name ' + (idx + 1)"
            />
            <select v-if="category === 'mixed'" v-model="player.mixedGroup" class="input mixed-group-input"
              :aria-label="'Mixed doubles group for player ' + (idx + 1)">
              <option value="">Select group</option>
              <option v-for="group in mixedGroups" :key="group.id" :value="group.id">{{ group.label }}</option>
            </select>
            <button
              class="action-button ghost icon remove-player"
              @click="removePlayer(idx)"
              :aria-label="'Remove player ' + (player.name.trim() || idx + 1)"
              :disabled="players.length <= effectiveMinPlayers"
            >
              <AppIcon name="close" />
            </button>
          </div>
        </div>

        <button
          class="action-button full-width"
          @click="addPlayer"
        >
          + Add player
        </button>
      </div>

      <!-- Summary -->
      <div v-if="readyToGenerate" class="summary-box surface">
        <div class="summary-row">
          <span>Playing per round</span>
          <strong>{{ effectiveMinPlayers }}</strong>
        </div>
        <div class="summary-row">
          <span>Resting per round</span>
          <strong>{{ filledPlayers.length - effectiveMinPlayers }}</strong>
        </div>
        <div class="summary-row">
          <span>Estimated rounds</span>
          <strong>{{ targetRounds }}</strong>
        </div>
      </div>

      <!-- Generate button -->
      <button
        class="action-button primary full-width"
        :disabled="!readyToGenerate"
        @click="generate"
      >
        Create schedule
      </button>

      <p v-if="!readyToGenerate" class="error-hint">
        {{ category === 'mixed'
          ? 'Enter names and assign a group to each player. Mixed doubles needs two men and two women per court.'
          : 'Enter at least ' + effectiveMinPlayers + ' player names to create the schedule.' }}
      </p>
    </section>

    <div v-if="gameMode !== 'club' || step < 2" class="step-actions">
      <button v-if="step > 0" type="button" class="action-button" @click="showStep(step - 1)">Back</button>
      <button v-if="step < steps.length - 1" type="button" class="action-button primary step-next" @click="showStep(step + 1)">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStorage } from '../composables/useStorage.js'
import { generateSession, estimateCategoryRounds, estimateRounds, estimateRoundsCompletePartner } from '../composables/useRotation.js'
import { getMatchCategory, hasCourtRoster, matchCategories, mixedGroups } from '../composables/matchCategories.js'
import AppIcon from '../components/AppIcon.vue'
import NumberStepper from '../components/NumberStepper.vue'
import PageHeading from '../components/PageHeading.vue'
import ClubMatchConfig from '../components/ClubMatchConfig.vue'

const router = useRouter()
const { addGame } = useStorage()

const eventName = ref('')
const gameMode = ref('rotation')
const category = ref('doubles')
const step = ref(0)
const clubConfig = ref(null)
const namesToPaste = ref('')
const steps = computed(() => gameMode.value === 'club'
  ? ['Mode & session', category.value === 'singles' ? 'Clubs & players' : 'Clubs & pairs', 'Schedule']
  : ['Mode & session', 'Settings', 'Players']
)
const gameModes = [
  { id: 'rotation', title: 'Player rotation', description: 'Automatically assign partners and opponents from your roster.' },
  { id: 'club', title: 'Club vs Club', description: 'Schedule matches between players or pairs from different clubs.' },
]
const numCourts = ref(2)
const rotationMode = ref('americano')

const DEFAULT_NAMES = [
  'Andi', 'Budi', 'Citra', 'Dedi', 'Eka', 'Fitri', 'Gilang',
  'Hana', 'Indra', 'Joko', 'Kiki', 'Lina', 'Mega', 'Nanda',
  'Oscar', 'Putri', 'Qori', 'Rudi', 'Sari', 'Tono', 'Umi',
  'Vino', 'Wati', 'Xena', 'Yudi', 'Zara',
]

let nameCounter = 0
const players = ref([])

const effectiveMinPlayers = computed(() => numCourts.value * getMatchCategory(category.value).sideSize * 2)
const filledPlayers = computed(() => players.value.filter((player) => player.name.trim()))
const mixedRosterCounts = computed(() => mixedGroups.map(({ id }) =>
  filledPlayers.value.filter((player) => player.mixedGroup === id).length
))
const readyToGenerate = computed(() => hasCourtRoster(category.value, numCourts.value, filledPlayers.value))

watch([effectiveMinPlayers, category], ([minimum, nextCategory], [, previousCategory]) => {
  while (players.value.length < minimum) addPlayer()
  if (nextCategory === 'doubles' && nextCategory === previousCategory) return
  for (let index = players.value.length - 1; index >= 0 && players.value.length > minimum; index--) {
    const player = players.value[index]
    if (!player.name.trim() && !player.mixedGroup) players.value.splice(index, 1)
  }
}, { immediate: true })

const targetRounds = computed(() => {
  if (category.value !== 'doubles') return estimateCategoryRounds(category.value, numCourts.value, filledPlayers.value)
  if (rotationMode.value === 'completePartner') {
    return estimateRoundsCompletePartner(numCourts.value, filledPlayers.value.length)
  }
  return estimateRounds(numCourts.value, filledPlayers.value.length)
})

async function showStep(index) {
  if (step.value === index) return
  if (gameMode.value === 'club' && index === 2) {
    step.value = 1
    await nextTick()
    if (!clubConfig.value.validateRoster()) return
  }
  step.value = index
  await nextTick()
  document.querySelector('.config-step[aria-current="step"]')?.focus()
  window.scrollTo({ top: 0 })
}

function newPlayer(name = '') {
  return { id: ++nameCounter, name, mixedGroup: '' }
}

function addPlayer() {
  players.value.push(newPlayer())
}

function removePlayer(idx) {
  if (players.value.length > effectiveMinPlayers.value) {
    players.value.splice(idx, 1)
  }
}

function fillExampleNames() {
  const used = new Set(filledPlayers.value.map(({ name }) => name.trim().toLowerCase()))
  const examples = DEFAULT_NAMES.filter((name) => !used.has(name.toLowerCase()))
  for (const [index, player] of players.value.entries()) {
    if (!player.name.trim()) player.name = examples.shift() || `Sample player ${index + 1}`
  }
}

function pasteNames() {
  const names = namesToPaste.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean)
  const empty = players.value.filter((player) => !player.name.trim())
  for (const name of names) {
    const row = empty.shift()
    if (row) row.name = name
    else players.value.push(newPlayer(name))
  }
  namesToPaste.value = ''
}

function generate() {
  if (!readyToGenerate.value) return

  const roster = filledPlayers.value.map(({ id, name, mixedGroup }) =>
    category.value === 'mixed' ? { id, name: name.trim(), mixedGroup } : { id, name: name.trim() }
  )
  const game = generateSession(numCourts.value, roster, rotationMode.value, category.value)
  if (game) saveGame(game)
}

function saveGame(game) {
  game.name = eventName.value.trim() || `Session ${new Date().toLocaleDateString('en-GB')}`
  game.completed = false

  addGame(game)
  router.replace({ name: 'rotation', params: { gameId: game.id } })
}
</script>

<style scoped>
.config-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  padding: 5px;
  margin-bottom: 18px;
}

.config-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px 8px;
  min-height: 52px;
  padding: 6px 4px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.step-number {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--tag-bg);
  font-size: 12px;
}
.config-step[aria-current="step"] { border-color: var(--border-strong); background: var(--primary-bg); color: var(--primary); }
.config-step[aria-current="step"] .step-number { background: var(--primary); color: var(--on-primary); }

.config-panel { padding: clamp(16px, 4vw, 28px); }
.field + .field { margin-top: 20px; }
.mode-field { min-width: 0; border: 0; }
.mode-option {
  position: relative;
  display: block;
  padding: 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-control);
  background: var(--input-bg);
  cursor: pointer;
}
.mode-option + .mode-option { margin-top: 8px; }
.mode-option:has(input:checked) { border-color: var(--primary); background: var(--primary-bg); }
.mode-option:has(input:focus-visible) { outline: 2px solid var(--primary); outline-offset: 3px; }
.mode-option input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.mode-option small { display: block; color: var(--text-secondary); font-size: 14px; }

.step-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }
.field-label { display: block; margin-bottom: 8px; color: var(--text-primary); font-size: 15px; font-weight: 700; }
.field-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.field-row .field-label { margin: 0; }
.mode-toggle { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.mode-btn.active { border-color: var(--primary); background: var(--primary-bg); color: var(--primary); }
.mode-desc, .optional, .player-progress { color: var(--text-secondary); }
.mode-desc, .player-progress { margin-top: 8px; font-size: 14px; }
.optional { font-weight: 400; }
.player-progress { margin-bottom: 12px; }
.mixed-player-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(0, 8.5rem) auto;
}
.mixed-group-input { min-width: 0; }
@media (max-width: 480px) {
  .mixed-player-row { grid-template-columns: auto minmax(0, 1fr) auto; }
  .mixed-group-input { grid-area: 2 / 2; }
  .mixed-player-row .remove-player { grid-area: 1 / 3; }
}
.remove-player, .error-hint { color: var(--danger); }
.error-hint { margin-top: 8px; font-size: 14px; }
.paste-players { margin-bottom: 12px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-control); }
.paste-players summary { min-height: var(--size-control); align-content: center; cursor: pointer; font-weight: 650; }
.paste-players label { display: block; font-size: 14px; color: var(--text-secondary); }
.paste-players textarea { display: block; width: 100%; margin: 4px 0 8px; resize: vertical; }
.paste-players button { margin-bottom: 10px; }

.summary-box { margin: 16px 0; padding: 10px 14px; background: var(--input-bg); }
.summary-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 5px 0; font-size: 14px; }
.summary-row strong { color: var(--primary); font-variant-numeric: tabular-nums; }
.full-width { width: 100%; }

@media (min-width: 480px) {
  .config-step { flex-direction: row; }
}
</style>
