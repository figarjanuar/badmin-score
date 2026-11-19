<template>
  <div class="scoreboard">
    <div class="sb-header">
      <h2 class="view-title">{{ game?.name || 'Scoreboard' }}</h2>
      <p class="sb-date">{{ formatDate(game?.createdAt) }}</p>
    </div>

    <!-- Session summary -->
    <div class="sb-summary">
      <div class="stat">
        <span class="stat-value">{{ isClub ? game.clubs.length : game?.players.length || 0 }}</span>
        <span class="stat-label">{{ isClub ? 'Klub' : 'Pemain' }}</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ game?.numCourts || 0 }}</span>
        <span class="stat-label">Lapangan</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ isClub ? allMatches.length : game?.rounds.length || 0 }}</span>
        <span class="stat-label">{{ isClub ? 'Match' : 'Ronde' }}</span>
      </div>
    </div>

    <h3 class="section-title">🏆 {{ isClub ? 'Klasemen Klub' : 'Klasemen' }}</h3>
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
          <span class="match-round">{{ isSingleCourtClub ? 'Match ' + match.round : 'R' + match.round + ' · L' + match.court }}</span>
          <div class="match-teams">
            <span class="team team-home">🏠 {{ match.home }}</span>
            <span class="team-vs">vs</span>
            <span class="team team-away">✈️ {{ match.away }}</span>
          </div>
        </div>
        <MatchSetScores :sets="match.sets" />
      </div>
    </div>

    <div v-else class="empty-matches">
      <p>Belum ada skor yang dimasukkan</p>
    </div>

    <div class="scoreboard-actions">
      <button
        v-if="game?.completed"
        class="btn btn-primary btn-full"
        @click="showReopenConfirm = true"
      >
        🔓 Reopen Sesi
      </button>
      <button
        class="btn btn-outline btn-full back-btn"
        @click="goBack"
      >
        ⬅ Kembali
      </button>
    </div>

    <!-- Reopen Confirmation Modal -->
    <div v-if="showReopenConfirm" class="modal-overlay" @click.self="showReopenConfirm = false">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">🔓 Reopen Sesi?</h2>
          <button class="modal-close" @click="showReopenConfirm = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="confirm-text">Sesi akan dikembalikan ke mode berjalan, jadi skor dan ronde bisa diedit lagi kalau sebelumnya kepencet selesai.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showReopenConfirm = false">Batal</button>
          <button class="btn btn-primary" @click="confirmReopen">🔓 Ya, Reopen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppBack } from '../composables/useAppBack.js'
import { useStorage } from '../composables/useStorage.js'
import { useStandings } from '../composables/useStandings.js'
import MatchSetScores from '../components/MatchSetScores.vue'
import StandingsTable from '../components/StandingsTable.vue'

const props = defineProps({
  gameId: { type: String, required: true },
})
const router = useRouter()
const goBack = useAppBack()

const { getGame, updateGame } = useStorage()
const showReopenConfirm = ref(false)
const game = computed(() => getGame(props.gameId))
const isClub = computed(() => game.value?.mode === 'club')
const isSingleCourtClub = computed(() => isClub.value && game.value.numCourts === 1)
const { allMatches } = useStandings(game)

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function confirmReopen() {
  updateGame(props.gameId, { completed: false })
  showReopenConfirm.value = false
  router.replace({ name: 'rotation', params: { gameId: props.gameId } })
}
</script>

<style scoped>
.scoreboard {
  padding: 16px;
  max-width: 480px;
  margin: 0 auto;
}

.sb-header {
  margin-bottom: 16px;
}

.view-title {
  font-size: 22px;
  margin: 0;
  color: var(--text-primary);
}

.sb-date {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0 0;
}

/* Summary stats */
.sb-summary {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.stat {
  flex: 1;
  background: var(--card-bg);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.scoreboard-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

/* Section title */
.section-title {
  font-size: 16px;
  margin: 0 0 12px;
  color: var(--text-primary);
}

/* Standings table wrapper (component root) — spacing before matches list */
.standings-table-wrap {
  margin-bottom: 24px;
}

/* Matches */
.matches {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 24px;
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

.empty-matches {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Back button */
.back-btn {
  margin-bottom: 32px;
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
.btn-primary {
  background: var(--primary);
  color: #fff;
}
.btn-outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-primary);
}
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
