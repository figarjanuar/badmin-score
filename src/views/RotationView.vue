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

    <!-- SKOR pane: scoreboard for the current round -->
    <div v-show="activeTab === 'skor'" class="tab-pane">
    <!-- Round navigation: horizontal scroll -->
    <div
      class="round-nav-scroll"
      ref="roundNavRef"
      :class="{ 'fade-left': scrollLeftHint, 'fade-right': scrollRightHint }"
      @scroll="updateScrollHints"
    >
      <button
        v-for="(r, i) in game?.rounds || []"
        :key="r.num"
        class="round-chip"
        :class="{ active: i === currentRound }"
        @click="currentRound = i"
      >
        Ronde {{ i + 1 }}
      </button>
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

<!-- Actions -->
    <div class="rotation-actions">
      <button
        v-if="!game?.completed && currentRound === totalRounds - 1"
        class="btn btn-outline btn-full"
        @click="requestAddRound"
      >
        ➕ Tambah Ronde
      </button>
    </div>
    </div>

    <!-- PEMAIN pane: edit players mid-game -->
    <div v-show="activeTab === 'pemain'" class="tab-pane">
      <h3 class="section-title">👥 Pemain Aktif ({{ activePlayers.length }})</h3>
      <div class="player-list">
        <div v-for="(p, idx) in activePlayers" :key="p.id" class="player-row">
          <span class="player-num">{{ idx + 1 }}</span>
          <input
            class="input player-input"
            :value="p.name"
            :placeholder="'Pemain ' + (idx + 1)"
            :disabled="game?.completed"
            @blur="renamePlayer(p.id, $event.target.value)"
            @keyup.enter="$event.target.blur()"
          />
          <button
            class="btn-icon"
            :disabled="game?.completed || activePlayers.length <= minPlayers"
            @click="requestDelete(p)"
            title="Keluarkan dari rotasi"
          >✕</button>
        </div>
      </div>
      <button
        v-if="!game?.completed"
        class="btn btn-outline btn-full"
        @click="openAddPlayer"
      >
        ➕ Tambah Pemain
      </button>
      <p v-if="activePlayers.length <= minPlayers" class="error-hint">
        Minimal {{ minPlayers }} pemain untuk {{ game?.numCourts }} lapangan
      </p>

      <div v-if="inactivePlayers.length" class="inactive-section">
        <h4 class="section-title">💤 Pemain Keluar ({{ inactivePlayers.length }})</h4>
        <div v-for="p in inactivePlayers" :key="p.id" class="player-row row-inactive">
          <span class="player-num">—</span>
          <span class="inactive-name">{{ p.name || 'P' + p.id }}</span>
          <button
            class="btn-icon restore-btn"
            :disabled="game?.completed"
            @click="restorePlayer(p)"
            title="Masukkan kembali ke rotasi"
          >↺</button>
        </div>
      </div>

      <p v-if="game?.completed" class="confirm-text">Sesi sudah selesai, pemain tidak bisa diubah.</p>
    </div>

    <!-- KLASEMEN pane -->
    <div v-show="activeTab === 'klasemen'" class="tab-pane">
      <h3 class="section-title">🏆 Klasemen</h3>
      <StandingsTable :game-id="gameId" />

      <!-- All matches -->
      <h3 class="section-title">📋 Hasil Pertandingan</h3>
      <div class="matches" v-if="allMatches.length > 0">
        <div
          v-for="match in allMatches"
          :key="match.key"
          class="match-row"
        >
          <div class="match-info">
            <span class="match-round">R{{ match.round }} · L{{ match.court }}</span>
            <div class="match-teams">
              <span class="team team-home">🏠 {{ match.home }}</span>
              <span class="team-vs">vs</span>
              <span class="team team-away">✈️ {{ match.away }}</span>
            </div>
          </div>
          <div class="match-score-box" :class="{ 'score-played': match.score1 !== null }">
            <span v-if="match.score1 !== null" class="match-score-inner">
              <span class="ms-home">{{ match.score1 }}</span>
              <span class="ms-sep">-</span>
              <span class="ms-away">{{ match.score2 }}</span>
            </span>
            <span v-else class="ms-empty">—</span>
          </div>
        </div>
      </div>

      <div v-else class="empty-matches">
        <p>Belum ada skor yang dimasukkan</p>
      </div>
    </div>

    <!-- Add Round Confirmation Modal -->
    <div v-if="showAddRoundConfirm" class="modal-overlay" @click.self="showAddRoundConfirm = false">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">➕ Tambah Ronde?</h2>
          <button class="modal-close" @click="showAddRoundConfirm = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="confirm-text">Ronde ke-{{ totalRounds + 1 }} akan ditambahkan. Pemain akan dirotasi otomatis berdasarkan statistik permainan sebelumnya.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showAddRoundConfirm = false">Batal</button>
          <button class="btn btn-primary" @click="confirmAddRound">➕ Ya, Tambah</button>
        </div>
      </div>
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

    <!-- Delete Player Confirmation Modal -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">🗑️ Hapus Pemain?</h2>
          <button class="modal-close" @click="deleteTarget = null">✕</button>
        </div>
        <div class="modal-body">
          <p class="confirm-text">
            <b>{{ deleteTarget.name || 'P' + deleteTarget.id }}</b> akan keluar dari rotasi.
            Skor dan ronde sebelumnya tetap tersimpan.
            <span v-if="regeneratedFrom < totalRounds">
              Ronde {{ regeneratedFrom + 1 }}–{{ totalRounds }} akan disusun ulang.
            </span>
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="deleteTarget = null">Batal</button>
          <button class="btn btn-danger" @click="confirmDelete">🗑️ Hapus</button>
        </div>
      </div>
    </div>

    <!-- Add Player Modal -->
    <div v-if="showAddPlayer" class="modal-overlay" @click.self="showAddPlayer = false">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">➕ Tambah Pemain</h2>
          <button class="modal-close" @click="showAddPlayer = false">✕</button>
        </div>
        <div class="modal-body">
          <input
            ref="addPlayerInput"
            class="input player-input"
            v-model="newPlayerName"
            placeholder="Nama pemain"
            @keyup.enter="confirmAddPlayer"
          />
          <p class="confirm-text add-player-note">Pemain baru akan masuk ke ronde-ronde berikutnya.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showAddPlayer = false">Batal</button>
          <button class="btn btn-primary" @click="confirmAddPlayer">✅ Simpan</button>
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

    <!-- Bottom tab bar -->
    <nav class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-emoji">{{ tab.emoji }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useStorage } from '../composables/useStorage.js'
import { useStandings } from '../composables/useStandings.js'
import { pushGame } from '../composables/useFirestore.js'
import { generateNextRound, regenerateRemainingRounds, computeKeptCount } from '../composables/useRotation.js'
import EditScoreModal from '../components/EditScoreModal.vue'
import ShareModal from '../components/ShareModal.vue'
import StandingsTable from '../components/StandingsTable.vue'

const props = defineProps({
  gameId: { type: String, required: true },
})
const emit = defineEmits(['navigate'])

const { getGame, updateGame, subscribeToGame } = useStorage()
const game = computed(() => getGame(props.gameId))
const { allMatches } = useStandings(game)
const currentRound = ref(0)
const editCourt = ref(null)
const showFinishConfirm = ref(false)
const showAddRoundConfirm = ref(false)

// Bottom tab bar state
const tabs = [
  { id: 'pemain', emoji: '👥', label: 'Pemain' },
  { id: 'skor', emoji: '🏸', label: 'Skor' },
  { id: 'klasemen', emoji: '🏆', label: 'Klasemen' },
]
const activeTab = ref('skor')

// Player editing state
const deleteTarget = ref(null)
const showAddPlayer = ref(false)
const newPlayerName = ref('')
const addPlayerInput = ref(null)

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
const roundNavRef = ref(null)
const scrollLeftHint = ref(false)
const scrollRightHint = ref(false)

const editCourtData = computed(() => {
  if (!editCourt.value || !round.value) return null
  return round.value.courts.find((c) => c.court === editCourt.value) || null
})

// --- Player editing ---

const activePlayers = computed(() => (game.value?.players || []).filter((p) => !p.inactive))
const inactivePlayers = computed(() => (game.value?.players || []).filter((p) => p.inactive))
const minPlayers = computed(() => game.value?.numCourts * 4 || 0)
const regeneratedFrom = computed(() => {
  if (!deleteTarget.value || !game.value) return null
  return computeKeptCount(game.value.rounds, currentRound.value)
})

function playerName(id) {
  return game.value?.players.find((p) => p.id === id)?.name || `P${id}`
}

/**
 * Single commit path for player mutations: keeps the players array and the
 * (possibly regenerated) rounds atomically in one updateGame call, so local
 * storage and Firestore always see consistent state.
 */
function applyPlayerChange(newPlayers) {
  if (game.value?.completed) return false
  const activeIds = newPlayers.filter((p) => !p.inactive).map((p) => p.id)
  const result = regenerateRemainingRounds(game.value, activeIds, currentRound.value)
  if (result === null) {
    alert('Gagal menyusun ulang jadwal. Coba lagi.')
    return false
  }
  if (result.regeneratedFrom >= result.rounds.length) {
    updateGame(props.gameId, { players: newPlayers })
  } else {
    updateGame(props.gameId, { players: newPlayers, rounds: result.rounds })
  }
  return true
}

function renamePlayer(id, rawName) {
  if (game.value?.completed) return
  const name = rawName.trim()
  const players = game.value.players.map((p) => (p.id === id ? { ...p, name } : p))
  updateGame(props.gameId, { players })
}

function requestDelete(p) {
  if (game.value?.completed) return
  if (activePlayers.value.length <= minPlayers.value) return
  deleteTarget.value = p
}

function confirmDelete() {
  if (!deleteTarget.value) return
  const players = game.value.players.map((p) =>
    p.id === deleteTarget.value.id ? { ...p, inactive: true } : p
  )
  if (applyPlayerChange(players)) {
    deleteTarget.value = null
  }
}

function restorePlayer(p) {
  if (game.value?.completed) return
  const players = game.value.players.map((pl) =>
    pl.id === p.id ? { ...pl, inactive: false } : pl
  )
  applyPlayerChange(players)
}

function openAddPlayer() {
  newPlayerName.value = ''
  showAddPlayer.value = true
  nextTick(() => addPlayerInput.value?.focus())
}

function confirmAddPlayer() {
  const name = newPlayerName.value.trim()
  if (!name) {
    alert('Nama pemain tidak boleh kosong')
    return
  }
  const nextId = Math.max(0, ...game.value.players.map((p) => p.id)) + 1
  const players = [...game.value.players, { id: nextId, name }]
  if (applyPlayerChange(players)) {
    showAddPlayer.value = false
    newPlayerName.value = ''
  }
}

// Show fade hints on the strip edges only when there is content cut off
function updateScrollHints() {
  const el = roundNavRef.value
  if (!el) return
  scrollLeftHint.value = el.scrollLeft > 2
  scrollRightHint.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
}

// Keep the active round chip visible in the horizontal scroll strip
function scrollActiveRoundIntoView() {
  nextTick(() => {
    const el = roundNavRef.value?.querySelector('.round-chip.active')
    el?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
    updateScrollHints()
  })
}

watch(currentRound, scrollActiveRoundIntoView)

// Re-evaluate hints when rounds are added/removed (strip may become scrollable)
watch(totalRounds, () => nextTick(updateScrollHints))

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

// --- Add round ---

function requestAddRound() {
  showAddRoundConfirm.value = true
}

function confirmAddRound() {
  showAddRoundConfirm.value = false
  if (!game.value) return

  const newRound = generateNextRound(game.value)
  if (!newRound) {
    alert('Gagal menghasilkan ronde baru. Coba lagi.')
    return
  }

  const rounds = [...game.value.rounds, newRound]
  updateGame(props.gameId, { rounds })

  // Navigate to the new round
  currentRound.value = rounds.length - 1
}

// --- Real-time subscription ---

let unsubscribe = null
let resizeObserver = null

onMounted(() => {
  updateScrollHints()
  resizeObserver = new ResizeObserver(updateScrollHints)
  if (roundNavRef.value) resizeObserver.observe(roundNavRef.value)

  // Subscribe to Firestore for real-time sync if game is already shared
  if (window.location.hash.includes(`#/match/${props.gameId}`)) {
    unsubscribe = subscribeToGame(props.gameId)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
})
</script>

<style scoped>
.rotation {
  padding: 16px;
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
  max-width: 480px;
  margin: 0 auto;
}

/* --- Bottom tab bar --- */

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  display: flex;
  background: var(--card-bg);
  border-top: 1px solid var(--border);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 50;
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 0 6px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.tab-btn .tab-emoji {
  font-size: 20px;
  line-height: 1.2;
}

.tab-btn.active {
  color: var(--primary);
}

/* --- Shared pane/section styles --- */

.tab-pane {
  margin-top: 4px;
}

.section-title {
  font-size: 16px;
  margin: 0 0 12px;
  color: var(--text-primary);
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

.error-hint {
  text-align: center;
  color: var(--danger);
  font-size: 13px;
  margin: 8px 0 0;
}

/* --- Pemain tab --- */

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

.player-input:disabled {
  background: var(--tag-bg);
  cursor: not-allowed;
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

.inactive-section {
  margin-top: 24px;
}

.row-inactive {
  opacity: 0.55;
}

.inactive-name {
  flex: 1;
  font-size: 15px;
  color: var(--text-primary);
}

.restore-btn {
  color: var(--primary);
}

.add-player-note {
  margin-top: 8px;
}

/* --- Klasemen tab --- */

/* Standings table wrapper (component root) — spacing before matches list */
.standings-table-wrap {
  margin-bottom: 24px;
}

.matches {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.match-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--card-bg);
  border-radius: 10px;
  gap: 8px;
}

.match-info {
  flex: 1;
  min-width: 0;
}

.match-round {
  font-size: 10px;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.match-teams {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  flex-wrap: wrap;
}

.team {
  font-size: 13px;
  font-weight: 600;
}

.team-home { color: var(--green); }
.team-away { color: var(--primary); }

.team-vs {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary);
}

.match-score-box {
  flex-shrink: 0;
}

.match-score-inner {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 18px;
  font-weight: 800;
}

.ms-home { color: var(--green); }
.ms-away { color: var(--primary); }
.ms-sep { color: var(--text-secondary); }

.ms-empty {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary);
}

.score-played {
  color: var(--text-primary);
}

.empty-matches {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
  font-size: 14px;
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

/* Round nav: horizontal scroll strip */
.round-nav-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 2px 10px;
  margin-bottom: 10px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
}

.round-nav-scroll::-webkit-scrollbar {
  display: none;
}

/* Fade hints on the edges: show only while there is more content cut off */
.round-nav-scroll.fade-right {
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 24px), transparent 100%);
  mask-image: linear-gradient(to right, black calc(100% - 24px), transparent 100%);
}

.round-nav-scroll.fade-left {
  -webkit-mask-image: linear-gradient(to left, black calc(100% - 24px), transparent 100%);
  mask-image: linear-gradient(to left, black calc(100% - 24px), transparent 100%);
}

.round-nav-scroll.fade-left.fade-right {
  -webkit-mask-image: linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%);
}

.round-chip {
  flex-shrink: 0;
  scroll-snap-align: start;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.round-chip.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
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
