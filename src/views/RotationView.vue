<template>
  <div class="rotation">
    <!-- Top bar: header actions -->
    <div class="rotation-topbar">
      <h2 class="topbar-title">{{ game?.name || 'Rotasi' }}</h2>
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

    <!-- Round navigation -->
    <div class="round-nav">
      <button class="nav-btn" @click="prevRound" :disabled="currentRound === 0">◀</button>
      <span class="round-label">Ronde {{ currentRound + 1 }}/{{ totalRounds }}</span>
      <button class="nav-btn" @click="nextRound" :disabled="currentRound >= totalRounds - 1">▶</button>
    </div>

    <!-- Compact play count badges -->
    <div class="play-chips" v-if="false">
      <span
        v-for="p in playerSummaries"
        :key="p.id"
        class="play-chip"
        :class="{ 'chip-done': p.gamesPlayed >= targetGames }"
      >
        <span class="chip-name">{{ p.name }}</span>
        <span class="chip-count">{{ p.gamesPlayed }}x</span>
      </span>
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
          <button class="court-edit-btn" @click="openEditModal(court.court)">✏️</button>
        </div>
        <div class="court-match">
          <div class="pair pair-home">
            <div class="player-tag" v-for="pid in court.pair1" :key="pid">
              {{ playerName(pid) }}
            </div>
          </div>
          <div class="vs">VS</div>
          <div class="pair pair-away">
            <div class="player-tag" v-for="pid in court.pair2" :key="pid">
              {{ playerName(pid) }}
            </div>
          </div>
        </div>
        <div class="court-score-display" v-if="court.score1 !== null && court.score2 !== null">
          <span class="score-display">
            <span class="score-home">{{ court.score1 }}</span>
            <span class="score-sep"> - </span>
            <span class="score-away">{{ court.score2 }}</span>
          </span>
        </div>
        <div class="court-score-display score-empty" v-else>
          <span class="score-placeholder">— Belum ada skor —</span>
        </div>
      </div>
    </div>

    <!-- Resting players -->
    <div class="resting" v-if="round && round.resting.length > 0">
      <h3 class="resting-title">Istirahat</h3>
      <div class="resting-list">
        <span class="player-tag resting-tag" v-for="pid in round.resting" :key="pid">
          {{ playerName(pid) }}
        </span>
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

    <!-- Edit Score Modal (per match) -->
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
import { ref, computed } from 'vue'
import { useStorage } from '../composables/useStorage.js'
import EditScoreModal from '../components/EditScoreModal.vue'

const props = defineProps({
  gameId: { type: String, required: true },
})
const emit = defineEmits(['navigate'])

const { getGame, updateGame } = useStorage()
const game = computed(() => getGame(props.gameId))
const currentRound = ref(0)
const editCourt = ref(null)
const showFinishConfirm = ref(false)

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

function finishSession() {
  showFinishConfirm.value = true
}

function confirmFinish() {
  updateGame(props.gameId, { completed: true })
  showFinishConfirm.value = false
  emit('navigate', 'scoreboard', props.gameId)
}
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
}

.topbar-title {
  font-size: 18px;
  margin: 0;
  color: var(--text-primary);
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

.court-match {
  display: flex;
  align-items: flex-start;
  padding: 16px 16px 12px;
  gap: 0;
}

.pair {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pair-home {
  align-items: stretch;
}

.pair-away {
  align-items: flex-end;
}

.pair-home .player-tag {
  display: block;
}

.pair-away .player-tag {
  display: inline-block;
  padding: 6px 8px;
}

.vs {
  padding: 16px 12px 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.player-tag {
  width: 100%;
  display: inline-block;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  background: var(--tag-bg);
  color: var(--text-primary);
}

/* Score display */
.court-score-display {
  text-align: center;
  padding: 0 16px 12px;
}

.score-display {
  display: inline-flex;
  align-items: center;
  gap: 0;
  font-size: 20px;
  font-weight: 800;
  background: var(--primary-bg);
  padding: 4px 20px;
  border-radius: 8px;
}

.score-home { color: var(--green); }
.score-away { color: var(--primary); }
.score-sep { color: var(--text-secondary); }

.score-empty {
  padding-bottom: 12px;
}

.score-placeholder {
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
}

/* Resting */
.resting {
  margin-bottom: 16px;
}

.resting-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 8px;
}

.resting-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.resting-tag {
  background: var(--tag-dim-bg);
  color: var(--text-secondary);
  font-weight: 400;
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
