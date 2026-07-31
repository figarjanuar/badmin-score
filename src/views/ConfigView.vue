<template>
  <div class="config">
    <h2 class="view-title">Konfigurasi Game</h2>

    <!-- Event name -->
    <div class="field">
      <label class="field-label">Nama Event</label>
      <input
        v-model="eventName"
        type="text"
        class="input"
        placeholder="Mis: Reclub Jumat"
      />
    </div>

    <!-- Court count -->
    <div class="field">
      <label class="field-label">Jumlah Lapangan</label>
      <div class="stepper">
        <button class="stepper-btn" @click="changeCourts(-1)">−</button>
        <span class="stepper-value">{{ numCourts }}</span>
        <button class="stepper-btn" @click="changeCourts(1)">+</button>
      </div>
    </div>

    <!-- Player names -->
    <div class="field">
      <div class="field-row">
        <label class="field-label">Daftar Pemain ({{ players.length }})</label>
        <button class="btn btn-sm btn-outline" @click="randomizeNames">
          🎲 Acak Nama
        </button>
      </div>

      <div class="player-list">
        <div
          v-for="(player, idx) in players"
          :key="player.id"
          class="player-row"
        >
          <span class="player-num">{{ idx + 1 }}</span>
          <input
            v-model="player.name"
            type="text"
            class="input player-input"
            :placeholder="'Pemain ' + (idx + 1)"
          />
          <button
            class="btn-icon"
            @click="removePlayer(idx)"
            :disabled="players.length <= effectiveMinPlayers"
          >
            ✕
          </button>
        </div>
      </div>

      <button
        class="btn btn-outline btn-full"
        @click="addPlayer"
      >
        + Tambah Pemain
      </button>
    </div>

    <!-- Summary -->
    <div class="summary-box">
      <div class="summary-row">
        <span>Pemain main per ronde:</span>
        <strong>{{ numCourts * 4 }} orang</strong>
      </div>
      <div class="summary-row">
        <span>Pemain istirahat per ronde:</span>
        <strong>{{ Math.max(0, players.length - numCourts * 4) }} orang</strong>
      </div>
      <div class="summary-row">
        <span>Target ronde:</span>
        <strong>{{ targetRounds }} ronde</strong>
      </div>
    </div>

    <!-- Generate button -->
    <button
      class="btn btn-primary btn-full btn-generate"
      :disabled="players.length < effectiveMinPlayers"
      @click="generate"
    >
      ▶️ Generate Jadwal
    </button>

    <p v-if="players.length < effectiveMinPlayers" class="error-hint">
      Minimal {{ effectiveMinPlayers }} pemain untuk {{ numCourts }} lapangan
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStorage } from '../composables/useStorage.js'
import { generateSession, estimateRounds } from '../composables/useRotation.js'

const emit = defineEmits(['navigate'])
const { addGame } = useStorage()

const eventName = ref('')
const numCourts = ref(2)

const DEFAULT_NAMES = [
  'Andi', 'Budi', 'Citra', 'Dedi', 'Eka', 'Fitri', 'Gilang',
  'Hana', 'Indra', 'Joko', 'Kiki', 'Lina', 'Mega', 'Nanda',
  'Oscar', 'Putri', 'Qori', 'Rudi', 'Sari', 'Tono', 'Umi',
  'Vino', 'Wati', 'Xena', 'Yudi', 'Zara',
]

let nameCounter = 0
const players = ref(
  Array.from({ length: 8 }, () => ({
    id: ++nameCounter,
    name: '',
  }))
)

const effectiveMinPlayers = computed(() => numCourts.value * 4)

const targetRounds = computed(() => estimateRounds(numCourts.value, players.value.length))

function changeCourts(delta) {
  const next = numCourts.value + delta
  if (next >= 1 && next <= 6) {
    numCourts.value = next
  }
}

function addPlayer() {
  players.value.push({ id: ++nameCounter, name: '' })
}

function removePlayer(idx) {
  if (players.value.length > effectiveMinPlayers.value) {
    players.value.splice(idx, 1)
  }
}

function randomizeNames() {
  const shuffled = [...DEFAULT_NAMES].sort(() => Math.random() - 0.5)
  players.value.forEach((p, i) => {
    if (i < shuffled.length) {
      p.name = shuffled[i]
    }
  })
}

function generate() {
  const filled = players.value.filter((p) => p.name.trim())
  if (filled.length < effectiveMinPlayers.value) {
    alert(`Minimal ${effectiveMinPlayers.value} pemain untuk ${numCourts.value} lapangan`)
    return
  }

  const game = generateSession(numCourts.value, filled.map((p) => ({ id: p.id, name: p.name.trim() })))
  game.name = eventName.value.trim() || `Game ${new Date().toLocaleDateString('id-ID')}`
  game.completed = false

  addGame(game)
  emit('navigate', 'rotation', game.id)
}
</script>

<style scoped>
.config {
  padding: 16px;
  max-width: 480px;
  margin: 0 auto;
}

.view-title {
  font-size: 22px;
  margin: 0 0 20px;
  color: var(--text-primary);
}

.field {
  margin-bottom: 20px;
}

.field-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.input {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 16px;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
}

/* Stepper */
.stepper {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stepper-btn {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 20px;
  cursor: pointer;
}

.stepper-value {
  font-size: 24px;
  font-weight: 700;
  min-width: 32px;
  text-align: center;
  color: var(--text-primary);
}

/* Player list */
.player-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-num {
  width: 24px;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: right;
}

.player-input {
  flex: 1;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  color: var(--danger);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Summary */
.summary-box {
  background: var(--card-bg);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: var(--text-primary);
}

.summary-row strong {
  color: var(--primary);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
}
.btn:active { opacity: 0.8; }
.btn-full { width: 100%; }
.btn-sm { padding: 8px 14px; font-size: 13px; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-primary);
}

.btn-generate {
  padding: 14px;
  font-size: 17px;
  border-radius: 12px;
}

.error-hint {
  text-align: center;
  color: var(--danger);
  font-size: 13px;
  margin: 8px 0 0;
}
</style>
