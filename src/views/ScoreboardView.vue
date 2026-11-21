<template>
  <div class="page scoreboard">
    <PageHeading :title="game?.name || 'Session results'"
      :label="'Session results · ' + getMatchCategory(game?.category).label" :description="formatDate(game?.createdAt)">
      <template #actions>
        <button type="button" class="action-button" @click="openShare"><AppIcon name="share" /> Share results</button>
        <button v-if="game?.completed" type="button" class="action-button ghost" @click="showReopenConfirm = true">
          Reopen session
        </button>
      </template>
    </PageHeading>

    <!-- Session summary -->
    <div class="sb-summary surface">
      <div class="stat">
        <span class="stat-value">{{ isClub ? game.clubs.length : game?.players.length || 0 }}</span>
        <span class="stat-label">{{ isClub ? 'Clubs' : 'Players' }}</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ game?.numCourts || 0 }}</span>
        <span class="stat-label">Courts</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ isClub ? allMatches.length : game?.rounds.length || 0 }}</span>
        <span class="stat-label">{{ isClub ? 'Matches' : 'Rounds' }}</span>
      </div>
    </div>

    <div class="results-detail">
      <StandingsTable :game-id="gameId" />
      <MatchHistory :matches="confirmedMatches" :single-court-club="isSingleCourtClub" />
    </div>

    <AppDialog v-if="showReopenConfirm" title="Reopen session?" @close="showReopenConfirm = false">
      <p>The session will be active again. Choose Correct result on any match you need to edit.</p>
      <template #actions>
        <button type="button" class="action-button" @click="showReopenConfirm = false">Cancel</button>
        <button type="button" class="action-button primary" @click="confirmReopen">Reopen</button>
      </template>
    </AppDialog>
    <ShareModal v-if="showShare" :url="shareUrl" :status="getSyncStatus(gameId)"
      @retry="shareGame(gameId)" @close="showShare = false" />

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getFinalMatchResult } from '../composables/matchScores.js'
import { getMatchCategory } from '../composables/matchCategories.js'
import AppDialog from '../components/AppDialog.vue'
import AppIcon from '../components/AppIcon.vue'
import ShareModal from '../components/ShareModal.vue'
import { useStorage } from '../composables/useStorage.js'
import { useStandings } from '../composables/useStandings.js'
import PageHeading from '../components/PageHeading.vue'
import MatchHistory from '../components/MatchHistory.vue'
import StandingsTable from '../components/StandingsTable.vue'

const props = defineProps({
  gameId: { type: String, required: true },
})
const router = useRouter()

const { getGame, updateGame, shareGame, getSyncStatus } = useStorage()
const showReopenConfirm = ref(false)
const showShare = ref(false)
const shareUrl = ref('')
const game = computed(() => getGame(props.gameId))
const isClub = computed(() => game.value?.mode === 'club')
const isSingleCourtClub = computed(() => isClub.value && game.value.numCourts === 1)
const { allMatches, confirmedMatches } = useStandings(game)

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function openShare() {
  const { href } = router.resolve({ name: 'rotation', params: { gameId: props.gameId } })
  shareUrl.value = new URL(href, window.location.href).href
  shareGame(props.gameId)
  showShare.value = true
}

function confirmReopen() {
  const rounds = game.value.rounds.map((round) => ({
    ...round,
    courts: round.courts.map((court) => ({
      ...court,
      confirmed: !!getFinalMatchResult(court, game.value),
    })),
  }))
  updateGame(props.gameId, { completed: false, rounds })
  showReopenConfirm.value = false
  router.replace({ name: 'rotation', params: { gameId: props.gameId } })
}
</script>

<style scoped>
.sb-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: clamp(24px, 4vw, 40px);
}

.stat { padding: clamp(10px, 3vw, 22px); text-align: center; }
.stat + .stat { border-inline-start: 1px solid var(--border); }
.stat-value {
  display: block;
  color: var(--primary);
  font: 700 clamp(32px, 5vw, 54px) / 1 var(--font-display);
  font-variant-numeric: tabular-nums;
}
.stat-label { display: block; margin-top: 5px; color: var(--text-secondary); font-size: 13px; }
.results-detail { display: grid; align-items: start; gap: 24px; }

@media (min-width: 1040px) {
  .results-detail { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); }
}
</style>
