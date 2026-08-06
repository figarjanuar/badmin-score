<template>
  <div class="scoreboard">
    <div class="sb-header">
      <h2 class="view-title">{{ game?.name || 'Scoreboard' }}</h2>
      <p class="sb-date">{{ formatDate(game?.createdAt) }}</p>
    </div>

    <!-- Session summary -->
    <div class="sb-summary">
      <div class="stat">
        <span class="stat-value">{{ game?.players.length || 0 }}</span>
        <span class="stat-label">Pemain</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ game?.numCourts || 0 }}</span>
        <span class="stat-label">Lapangan</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ game?.rounds.length || 0 }}</span>
        <span class="stat-label">Ronde</span>
      </div>
    </div>

    <!-- Player standings table -->
    <h3 class="section-title">🏆 Klasemen</h3>
    <div class="standings-table-wrap">
      <table class="standings-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-name">Nama</th>
            <th class="col-num">M</th>
            <th class="col-num">W</th>
            <th class="col-num">L</th>
            <th class="col-num">WR</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, idx) in standings"
            :key="item.id"
            :class="{ 'row-gold': idx === 0 && item.gamesPlayed > 0, 'row-silver': idx === 1 && item.gamesPlayed > 0, 'row-bronze': idx === 2 && item.gamesPlayed > 0 }"
          >
            <td class="col-rank">{{ idx + 1 }}</td>
            <td class="col-name">{{ item.name }}</td>
            <td class="col-num">{{ item.gamesPlayed }}/{{ targetGames }}</td>
            <td class="col-num col-win">{{ item.wins }}</td>
            <td class="col-num col-loss">{{ item.losses }}</td>
            <td class="col-num col-wr">{{ item.winRate }}%</td>
          </tr>
        </tbody>
      </table>
    </div>

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
        @click="emit('back')"
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
import { useStorage } from '../composables/useStorage.js'

const props = defineProps({
  gameId: { type: String, required: true },
})
const emit = defineEmits(['navigate', 'back'])

const { getGame, updateGame } = useStorage()
const showReopenConfirm = ref(false)
const game = computed(() => getGame(props.gameId))

// Target games per player: total slots (rounds × courts × 4) ÷ player count.
// Same formula as RotationView so both screens agree.
const targetGames = computed(() =>
  Math.round((game.value?.rounds.length || 0) * (game.value?.numCourts || 0) * 4 / (game.value?.players.length || 1))
)

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

const playerMap = computed(() => {
  const m = {}
  if (game.value) {
    game.value.players.forEach((p) => { m[p.id] = p.name })
  }
  return m
})

const allMatches = computed(() => {
  if (!game.value) return []
  const matches = []
  for (const round of game.value.rounds) {
    for (const court of round.courts) {
      const pair1 = court.pair1.map((id) => playerMap.value[id] || `P${id}`)
      const pair2 = court.pair2.map((id) => playerMap.value[id] || `P${id}`)
      matches.push({
        key: `R${round.num}C${court.court}`,
        round: round.num,
        court: court.court,
        home: pair1.join(' / '),
        away: pair2.join(' / '),
        score1: court.score1,
        score2: court.score2,
      })
    }
  }
  return matches
})

const standings = computed(() => {
  if (!game.value) return []
  const playerStats = {}

  game.value.players.forEach((p) => {
    playerStats[p.id] = { id: p.id, name: p.name, wins: 0, losses: 0, gamesPlayed: 0 }
  })

  for (const round of game.value.rounds) {
    for (const court of round.courts) {
      if (court.score1 === null || court.score2 === null) continue

      const pair1 = court.pair1
      const pair2 = court.pair2
      const p1Won = court.score1 > court.score2

      pair1.forEach((id) => {
        if (playerStats[id]) {
          playerStats[id].gamesPlayed++
          if (p1Won) playerStats[id].wins++
          else playerStats[id].losses++
        }
      })
      pair2.forEach((id) => {
        if (playerStats[id]) {
          playerStats[id].gamesPlayed++
          if (!p1Won) playerStats[id].wins++
          else playerStats[id].losses++
        }
      })
    }
  }

  const list = Object.values(playerStats)
    .map((s) => ({
      ...s,
      winRate: s.gamesPlayed > 0 ? Math.round((s.wins / s.gamesPlayed) * 100) : 0,
    }))

  const hasScores = list.some((s) => s.gamesPlayed > 0)

  if (!hasScores) {
    // No scores yet — show all players in random order
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]]
    }
    return list
  }

  return list
    .filter((s) => s.gamesPlayed > 0)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      if (b.winRate !== a.winRate) return b.winRate - a.winRate
      return a.gamesPlayed - b.gamesPlayed
    })
})

function confirmReopen() {
  updateGame(props.gameId, { completed: false })
  showReopenConfirm.value = false
  emit('navigate', 'rotation', props.gameId)
}

// back navigation handled via viewStack in App.vue (@back event)
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

/* Standings table */
.standings-table-wrap {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
}

.standings-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.standings-table th {
  background: var(--tag-bg);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 8px 6px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.standings-table td {
  padding: 7px 6px;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
}

.standings-table tbody tr:last-child td {
  border-bottom: none;
}

.col-rank {
  width: 28px;
  text-align: center !important;
  font-weight: 700;
  color: var(--text-secondary);
}

.col-name {
  font-weight: 600;
}

.col-num {
  width: 44px;
  text-align: center !important;
  font-variant-numeric: tabular-nums;
}

.col-win {
  color: var(--green);
  font-weight: 600;
}

.col-loss {
  color: var(--danger);
  font-weight: 600;
}

.col-wr {
  font-weight: 700;
  color: var(--primary);
}

/* Podium highlight */
.row-gold td { background: #fff8e1; }
.row-silver td { background: #e8f4fd; }
.row-bronze td { background: #fff3e0; }

.row-gold .col-rank { color: #f59e0b; }
.row-silver .col-rank { color: #6cb9ef; }
.row-bronze .col-rank { color: #d97706; }

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
