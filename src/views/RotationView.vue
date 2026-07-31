<template>
  <div class="rotation">
    <!-- Top bar: header actions -->
    <div class="rotation-topbar">
      <h2 class="topbar-title">{{ game?.name || 'Rotasi' }}</h2>
      <div class="topbar-actions">
        <button
          class="btn btn-outline btn-sm btn-share"
          @click="openShare"
        >
          🔗 Bagikan
        </button>
        <button
          v-if="!game?.completed"
          class="btn btn-success btn-sm"
          @click="finishSession"
        >
          ✅ Selesai
        </button>
        <button
          v-else
          class="btn btn-outline btn-sm"
          @click="$emit('navigate', 'scoreboard', gameId)"
        >
          🏆 Scoreboard
        </button>
      </div>
    </div>

    <!-- Round navigation -->
    <div class="round-nav">
      <button class="nav-btn" @click="prevRound" :disabled="currentRound === 0">◀</button>
      <span class="round-label">Ronde {{ currentRound + 1 }}/{{ totalRounds }}</span>
      <button class="nav-btn" @click="nextRound" :disabled="currentRound >= totalRounds - 1">▶</button>
    </div>

    <!-- Court cards for current round -->
    <div class="courts" v-if="round">
      <div
        v-for="court in round.courts"
        :key="court.court"
        class="court-card"
      >
        <div class="court-header">
          <span>Lapangan {{ court.court }}</span>
          <button class="court-edit-btn" @click="openEditModal(court.court)" title="Edit skor manual">✏️</button>
        </div>

        <!-- Inline Scoreboard -->
        <div class="court-scoreboard">
          <!-- Team 1 (Home) -->
          <div class="sb-team">
            <div class="sb-players">
              <span v-for="pid in court.pair1" :key="pid" class="sb-player-name">{{ playerName(pid) }}</span>
            </div>
            <div class="sb-score-controls">
              <button
                class="sb-btn sb-minus"
                @click="adjustScore(court.court, 1, -1)"
                :disabled="game?.completed"
              >−</button>

              <!-- Inline edit or display -->
              <span
                v-if="editingCourt !== court.court || editingSide !== 1"
                class="sb-score"
                @click="startInlineEdit(court.court, 1)"
              >{{ court.score1 ?? 0 }}</span>
              <input
                v-else
                ref="inlineInput"
                type="number"
                class="sb-score-input"
                v-model.number="inlineScore"
                @blur="commitInlineEdit(court.court, 1)"
                @keyup.enter="commitInlineEdit(court.court, 1)"
                min="0"
                max="99"
                inputmode="numeric"
              />

              <button
                class="sb-btn sb-plus"
                @click="adjustScore(court.court, 1, 1)"
                :disabled="game?.completed"
              >+</button>
            </div>
          </div>

          <!-- VS divider -->
          <div class="sb-vs">VS</div>

          <!-- Team 2 (Away) -->
          <div class="sb-team">
            <div class="sb-players">
              <span v-for="pid in court.pair2" :key="pid" class="sb-player-name">{{ playerName(pid) }}</span>
            </div>
            <div class="sb-score-controls">
              <button
                class="sb-btn sb-minus"
                @click="adjustScore(court.court, 2, -1)"
                :disabled="game?.completed"
              >−</button>

              <!-- Inline edit or display -->
              <span
                v-if="editingCourt !== court.court || editingSide !== 2"
                class="sb-score"
                @click="startInlineEdit(court.court, 2)"
              >{{ court.score2 ?? 0 }}</span>
              <input
                v-else
                ref="inlineInput"
                type="number"
                class="sb-score-input"
                v-model.number="inlineScore"
                @blur="commitInlineEdit(court.court, 2)"
                @keyup.enter="commitInlineEdit(court.court, 2)"
                min="0"
                max="99"
                inputmode="numeric"
              />

              <button
                class="sb-btn sb-plus"
                @click="adjustScore(court.court, 2, 1)"
                :disabled="game?.completed"
              >+</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Standings -->
    <div class="rotation-actions">
      <button
        class="btn btn-outline btn-full btn-standings"
        @click="$emit('navigate', 'scoreboard', gameId)"
      >
        🏆 Lihat Klasemen
      </button>
    </div>

    <!-- Finish Confirmation Modal -->
    <div v-if="showFinishConfirm" class="modal-overlay" @click.self="showFinishConfirm = false">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">✅ Akhiri Sesi?</h2>
          <button class="modal-close" @click="showFinishConfirm = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="confirm-text">Setelah diakhiri, sesi ini akan ditandai selesai dan kamu bisa melihat scoreboard akhir.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showFinishConfirm = false">Batal</button>
          <button class="btn btn-danger" @click="confirmFinish">✅ Ya, Akhiri</button>
        </div>
      </div>
    </div>

    <!-- Share Modal -->
    <ShareModal
      v-if="showShareModal"
      :url="shareUrl"
      @close="showShareModal = false"
    />

    <!-- Edit Score Modal (fallback for detailed editing) -->
    <EditScoreModal
      v-if="editCourt"
      :court="editCourtData"
      :players="game?.players || []"
      @close="editCourt = null"
      @save="handleScoreSave"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useStorage } from '../composables/useStorage.js'
import { pushGame } from '../composables/useFirestore.js'
import EditScoreModal from '../components/EditScoreModal.vue'
import ShareModal from '../components/ShareModal.vue'

const props = defineProps({
  gameId: { type: String, required: true },
})
const emit = defineEmits(['navigate'])

const { getGame, updateGame, subscribeToGame } = useStorage()
const game = computed(() => getGame(props.gameId))
const currentRound = ref(0)
const editCourt = ref(null)
const showFinishConfirm = ref(false)

// Scoreboard inline edit state
const editingCourt = ref(null)
const editingSide = ref(null)
const inlineScore = ref(0)
const inlineInput = ref(null)

// Share state
const showShareModal = ref(false)
const shareUrl = ref('')

const totalRounds = computed(() => game.value?.rounds.length || 0)
const targetGames = computed(() =>
  Math.round(totalRounds.value * game.value?.numCourts * 4 / (game.value?.players.length || 1))
)
const round = computed(() => game.value?.rounds[currentRound.value] || null)

const editCourtData = computed(() => {
  if (!editCourt.value || !round.value) return null
  return round.value.courts.find((c) => c.court === editCourt.value) || null
})

function playerName(id) {
  return game.value?.players.find((p) => p.id === id)?.name || `P${id}`
}

const playerSummaries = computed(() => {
  if (!game.value) return []
  return game.value.players.map((p) => {
    const gamesPlayed = game.value.rounds.filter((r) =>
      r.courts.some((c) => c.pair1.includes(p.id) || c.pair2.includes(p.id))
    ).length
    return { ...p, gamesPlayed }
  })
})

function prevRound() {
  if (currentRound.value > 0) currentRound.value--
}

function nextRound() {
  if (currentRound.value < totalRounds.value - 1) currentRound.value++
}

function openEditModal(courtNum) {
  editCourt.value = courtNum
}

function handleScoreSave(updatedCourt) {
  const rounds = JSON.parse(JSON.stringify(game.value.rounds))
  const courts = rounds[currentRound.value].courts
  const idx = courts.findIndex((c) => c.court === updatedCourt.court)
  if (idx !== -1) {
    courts[idx] = updatedCourt
  }
  updateGame(props.gameId, { rounds })
  editCourt.value = null
}

// --- Scoreboard inline controls ---

function adjustScore(courtNum, side, delta) {
  if (game.value?.completed) return
  const rounds = JSON.parse(JSON.stringify(game.value.rounds))
  const courts = rounds[currentRound.value].courts
  const court = courts.find((c) => c.court === courtNum)
  if (!court) return
  const key = side === 1 ? 'score1' : 'score2'
  const current = court[key] ?? 0
  court[key] = Math.max(0, current + delta)
  updateGame(props.gameId, { rounds })
}

function startInlineEdit(courtNum, side) {
  if (game.value?.completed) return
  editingCourt.value = courtNum
  editingSide.value = side
  const court = round.value.courts.find((c) => c.court === courtNum)
  const key = side === 1 ? 'score1' : 'score2'
  inlineScore.value = court?.[key] ?? 0
  nextTick(() => {
    if (inlineInput.value) {
      // inlineInput is an array of refs; grab the last one rendered
      const inputs = Array.isArray(inlineInput.value) ? inlineInput.value : [inlineInput.value]
      const el = inputs[inputs.length - 1]
      if (el && el.focus) el.focus()
    }
  })
}

function commitInlineEdit(courtNum, side) {
  const rounds = JSON.parse(JSON.stringify(game.value.rounds))
  const courts = rounds[currentRound.value].courts
  const court = courts.find((c) => c.court === courtNum)
  if (!court) return
  const key = side === 1 ? 'score1' : 'score2'
  court[key] = Math.max(0, inlineScore.value)
  updateGame(props.gameId, { rounds })
  editingCourt.value = null
  editingSide.value = null
}

// --- Share ---

function openShare() {
  shareUrl.value = `${window.location.origin}${window.location.pathname}#/match/${props.gameId}`
  window.location.hash = `#/match/${props.gameId}`
  // Ensure game is pushed to Firestore before sharing
  if (game.value) {
    pushGame(game.value).catch(() => {})
  }
  showShareModal.value = true
}

// --- Finish session ---

function finishSession() {
  showFinishConfirm.value = true
}

function confirmFinish() {
  updateGame(props.gameId, { completed: true })
  showFinishConfirm.value = false
  emit('navigate', 'scoreboard', props.gameId)
}

// --- Real-time subscription ---

let unsubscribe = null

onMounted(() => {
  // Subscribe to Firestore for real-time sync if game is already shared
  if (window.location.hash.includes(`#/match/${props.gameId}`)) {
    unsubscribe = subscribeToGame(props.gameId)
  }
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
})
</script>

<style scoped>
.rotation {
  padding: 16px;
  max-width: 480px;
  margin: 0 auto;
}

/* Top bar */
.rotation-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.topbar-title {
  font-size: 18px;
  margin: 0;
  color: var(--text-primary);
}

.topbar-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* Round nav */
.round-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
}

.nav-btn {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 18px;
  cursor: pointer;
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.round-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Play count chips */
.play-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
  padding: 10px 12px;
  background: var(--card-bg);
  border-radius: 10px;
}

.play-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px 3px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: var(--tag-bg);
  color: var(--text-primary);
}

.play-chip .chip-count {
  font-weight: 700;
  color: var(--primary);
}

.chip-done {
  background: var(--green-bg);
  color: var(--green);
}
.chip-done .chip-count {
  color: var(--green);
}

/* Court cards */
.courts {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.court-card {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
}

.court-header {
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.court-edit-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  width: 32px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.court-edit-btn:active {
  background: rgba(255,255,255,0.35);
}

/* --- Inline Scoreboard --- */

.court-scoreboard {
  display: flex;
  align-items: center;
  padding: 12px 12px 16px;
  gap: 4px;
}

.sb-team {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.sb-players {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
}

.sb-player-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  word-break: break-word;
}

.sb-score-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sb-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.sb-btn:active {
  opacity: 0.7;
}

.sb-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.sb-minus {
  background: #fee2e2;
  color: #ef4444;
}

.sb-plus {
  background: #dcfce7;
  color: #16a34a;
}

.sb-score {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  min-width: 40px;
  text-align: center;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  transition: background 0.15s;
  user-select: none;
}

.sb-score:hover {
  background: var(--tag-bg);
}

.sb-score-input {
  width: 50px;
  height: 40px;
  font-size: 28px;
  font-weight: 800;
  text-align: center;
  border: 2px solid var(--primary);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--text-primary);
  outline: none;
  -moz-appearance: textfield;
}

.sb-score-input::-webkit-inner-spin-button,
.sb-score-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.sb-vs {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  padding: 0 4px;
  align-self: flex-start;
  margin-top: 28px;
}

/* Actions */
.rotation-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 24px;
}

.btn-standings {
  border-color: var(--yellow);
  color: var(--yellow);
}

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
.btn-success { background: var(--green); color: #fff; }
.btn-danger { background: var(--danger); color: #fff; }
.btn-outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-primary);
}
.btn-share {
  border-color: var(--primary);
  color: var(--primary);
}

/* Confirmation modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-container {
  background: var(--card-bg);
  width: 100%;
  max-width: 340px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 17px;
  margin: 0;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 20px;
}

.confirm-text {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.modal-footer {
  display: flex;
  gap: 8px;
  padding: 0 20px 20px;
}

.modal-footer .btn {
  flex: 1;
}
</style>
