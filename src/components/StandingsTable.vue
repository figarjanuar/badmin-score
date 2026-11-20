<template>
  <section class="standings-table-wrap" :aria-labelledby="headingId">
    <div class="standings-heading">
      <h2 :id="headingId">{{ isClub ? 'Club standings' : 'Standings' }}</h2>
      <div ref="info" class="standings-info" @pointerenter="showOnHover" @pointerleave="hovered = false">
        <button type="button" class="action-button icon info-button" aria-label="How standings are calculated"
          :aria-expanded="showInfo" :aria-controls="infoId" @click="toggleInfo">
          <AppIcon name="info" />
        </button>
        <div v-show="showInfo" :id="infoId" class="info-panel">
          <dl>
            <div><dt>Played</dt><dd>Confirmed matches / scheduled matches</dd></div>
            <div><dt>± Pts</dt><dd>Points scored minus points conceded</dd></div>
            <div><dt>Win %</dt><dd>Percentage of confirmed matches won</dd></div>
          </dl>
          <p>{{ isClub
            ? 'Ranked by win percentage, then point difference.'
            : 'Ranked by wins, then point difference, then win percentage.' }}</p>
        </div>
      </div>
    </div>
    <div class="standings-surface surface">
      <p v-if="winnerMessage" class="winner">{{ winnerMessage }}</p>
      <p v-if="!hasResults" class="empty-standings">No confirmed results yet.</p>
      <table v-else class="standings-table">
        <thead>
          <tr>
            <th scope="col" class="col-rank" aria-label="Rank">#</th>
            <th scope="col" class="col-name">{{ isClub ? 'Club' : 'Player' }}</th>
            <th scope="col" class="col-num">Played</th>
            <th scope="col" class="col-num">Won</th>
            <th scope="col" class="col-num">Lost</th>
            <th scope="col" class="col-num" aria-label="Point difference">± Pts</th>
            <th scope="col" class="col-num" aria-label="Win percentage">Win %</th>
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
            <th scope="row" class="col-name">{{ item.name }}</th>
            <td class="col-num">{{ item.gamesPlayed }}/{{ item.totalGames }}</td>
            <td class="col-num col-win">{{ item.wins }}</td>
            <td class="col-num col-loss">{{ item.losses }}</td>
            <td class="col-num">{{ item.pointDiff > 0 ? '+' : '' }}{{ item.pointDiff }}</td>
            <td class="col-num col-wr">{{ item.winRate }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, useId } from 'vue'
import { useStorage } from '../composables/useStorage.js'
import { useStandings } from '../composables/useStandings.js'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  gameId: { type: String, required: true },
})

const { getGame } = useStorage()
const game = computed(() => getGame(props.gameId))
const { standings } = useStandings(game)
const isClub = computed(() => game.value?.mode === 'club')
const hasResults = computed(() => standings.value.some((item) => item.gamesPlayed > 0))
const headingId = useId()
const infoId = useId()
const info = ref(null)
const hovered = ref(false)
const pinned = ref(false)
const showInfo = computed(() => hovered.value || pinned.value)

function showOnHover(event) {
  if (event.pointerType === 'mouse') hovered.value = true
}

function dismissInfo() {
  pinned.value = false
  hovered.value = false
}

function toggleInfo() {
  if (pinned.value) dismissInfo()
  else pinned.value = true
}

function onPointerDown(event) {
  if (showInfo.value && !info.value?.contains(event.target)) dismissInfo()
}

function onKeyDown(event) {
  if (event.key === 'Escape' && showInfo.value) dismissInfo()
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeyDown)
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeyDown)
})

const winnerMessage = computed(() => {
  if (!isClub.value || !game.value.completed || !hasResults.value) return ''
  const leaders = standings.value.filter((club) => club.rank === 1)
  if (leaders.length === 1) return 'Winner: ' + leaders[0].name
  return 'Tied for first: ' + leaders.map((club) => club.name).join(', ')
})
</script>

<style scoped>
.standings-heading {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.standings-heading h2 { font-size: 20px; }

.info-button { color: var(--primary); }

.info-panel {
  position: absolute;
  z-index: 2;
  top: 100%;
  right: 0;
  width: min(100%, 320px);
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
  font-size: 14px;
  color: var(--text-secondary);
}

.info-panel dl { display: grid; gap: 6px; }
.info-panel dt { font-weight: 700; color: var(--text-primary); }
.info-panel p { margin-top: 8px; }

.standings-surface {
  overflow: auto;
}

.winner {
  padding: 12px;
  background: var(--primary-bg);
  color: var(--primary);
  font-weight: 700;
}

.standings-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.standings-table thead th {
  background: var(--tag-bg);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 10px 6px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.standings-table td, .standings-table tbody th {
  padding: 10px 6px;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
}

.standings-table tbody tr:last-child > * {
  border-bottom: none;
}

.col-rank {
  width: 28px;
  text-align: center !important;
  font-weight: 700;
  color: var(--text-secondary);
}

.col-name {
  text-align: left;
  overflow-wrap: anywhere;
  font-weight: 600;
}

.col-num {
  width: 42px;
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
.row-gold > * { background: var(--primary-bg); }
.row-gold .col-rank { color: var(--primary); }
.row-silver .col-rank { color: var(--text-primary); }
.row-bronze .col-rank { color: var(--yellow); }

/* Players who left the session (inactive) — old scores still count */
.row-inactive .col-name { color: var(--text-secondary); }
.empty-standings { padding: 12px; color: var(--text-secondary); }

@media (max-width: 390px) {
  .standings-table thead th, .standings-table td, .standings-table tbody th { padding-inline: 4px; }
  .col-num { width: 37px; }
}
</style>
