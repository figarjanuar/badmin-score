<template>
  <div class="standings-table-wrap">
    <p v-if="winnerMessage" class="winner">{{ winnerMessage }}</p>
    <table class="standings-table">
      <thead>
        <tr>
          <th class="col-rank">#</th>
          <th class="col-name">{{ isClub ? 'Klub' : 'Nama' }}</th>
          <th class="col-num">M</th>
          <th class="col-num">W</th>
          <th class="col-num">L</th>
          <th class="col-num" title="Selisih poin: poin dicetak dikurangi poin kemasukan">Diff</th>
          <th class="col-num">WR</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, idx) in standings"
          :key="item.id"
          :class="{
            'row-gold': (item.rank ?? idx + 1) === 1 && item.gamesPlayed > 0,
            'row-silver': (item.rank ?? idx + 1) === 2 && item.gamesPlayed > 0,
            'row-bronze': (item.rank ?? idx + 1) === 3 && item.gamesPlayed > 0,
            'row-inactive': item.inactive,
          }"
        >
          <td class="col-rank">{{ item.rank ?? idx + 1 }}</td>
          <td class="col-name">{{ item.name }}</td>
          <td class="col-num">{{ item.gamesPlayed }}/{{ item.totalGames }}</td>
          <td class="col-num col-win">{{ item.wins }}</td>
          <td class="col-num col-loss">{{ item.losses }}</td>
          <td class="col-num">{{ item.pointDiff > 0 ? '+' : '' }}{{ item.pointDiff }}</td>
          <td class="col-num col-wr">{{ item.winRate }}%</td>
        </tr>
      </tbody>
    </table>
    <p class="standings-note">
      Diff = poin dicetak − poin kemasukan.
      {{ isClub ? 'Urutan klasemen: WR, lalu Diff.' : 'Urutan klasemen: menang, Diff, lalu WR.' }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStorage } from '../composables/useStorage.js'
import { useStandings } from '../composables/useStandings.js'

const props = defineProps({
  gameId: { type: String, required: true },
})

const { getGame } = useStorage()
const game = computed(() => getGame(props.gameId))
const { standings } = useStandings(game)
const isClub = computed(() => game.value?.mode === 'club')
const winnerMessage = computed(() => {
  if (!isClub.value || !game.value.completed) return ''
  const leaders = standings.value.filter((club) => club.rank === 1)
  if (leaders.length === 1) return '🏆 Pemenang: ' + leaders[0].name
  return 'Seri di posisi pertama: ' + leaders.map((club) => club.name).join(', ')
})
</script>

<style scoped>
.standings-table-wrap {
  background: var(--card-bg);
  border-radius: 12px;
  overflow-x: auto;
}

.winner {
  padding: 10px;
  font-weight: 700;
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

.standings-note {
  margin: 0;
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
}

/* Podium highlight */
.row-gold td { background: #fff8e1; }
.row-silver td { background: #e8f4fd; }
.row-bronze td { background: #fff3e0; }

.row-gold .col-rank { color: #f59e0b; }
.row-silver .col-rank { color: #6cb9ef; }
.row-bronze .col-rank { color: #d97706; }

/* Players who left the session (inactive) — old scores still count */
.row-inactive td { opacity: 0.55; }
</style>
