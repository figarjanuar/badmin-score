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

    <!-- Player standings -->
    <h3 class="section-title">🏆 Klasemen</h3>
    <div class="standings" v-if="standings.length > 0">
      <div
        v-for="(item, idx) in standings"
        :key="item.id"
        class="standing-row"
        :class="{ 'standing-gold': idx === 0, 'standing-silver': idx === 1, 'standing-bronze': idx === 2 }"
      >
        <span class="standing-rank">{{ idx + 1 }}</span>
        <div class="standing-info">
          <span class="standing-name">{{ item.name }}</span>
          <span class="standing-detail">{{ item.winRate }}% menang ({{ item.wins }}W / {{ item.losses }}L)</span>
        </div>
        <span class="standing-games">{{ item.gamesPlayed }} main</span>
      </div>
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

    <!-- Back button -->
    <button
      class="btn btn-outline btn-full back-btn"
      @click="emit('back')"
    >
      ⬅ Kembali
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStorage } from '../composables/useStorage.js'

const props = defineProps({
  gameId: { type: String, required: true },
})
const emit = defineEmits(['navigate', 'back'])

const { getGame } = useStorage()
const game = computed(() => getGame(props.gameId))

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

  return Object.values(playerStats)
    .filter((s) => s.gamesPlayed > 0)
    .map((s) => ({
      ...s,
      winRate: s.gamesPlayed > 0 ? Math.round((s.wins / s.gamesPlayed) * 100) : 0,
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      if (b.winRate !== a.winRate) return b.winRate - a.winRate
      return a.gamesPlayed - b.gamesPlayed
    })
})

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

/* Section title */
.section-title {
  font-size: 16px;
  margin: 0 0 12px;
  color: var(--text-primary);
}

/* Standings */
.standings {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 24px;
}

.standing-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--card-bg);
  padding: 12px;
  border-radius: 10px;
}

.standing-gold { background: #fff8e1; }
.standing-silver { background: #ddf1ff; }
.standing-bronze { background: #fff3e0; }

.standing-rank {
  width: 28px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary);
  text-align: center;
}

.standing-gold .standing-rank { color: #f59e0b; }
.standing-silver .standing-rank { color: #6cb9ef; }
.standing-bronze .standing-rank { color: #d97706; }

.standing-info {
  flex: 1;
}

.standing-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.standing-detail {
  font-size: 12px;
  color: var(--text-secondary);
}

.standing-games {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
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
.btn-outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-primary);
}
</style>
