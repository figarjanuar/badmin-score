<template>
  <div class="page rotation">
    <PageHeading :title="game?.name || 'Rotation'" :label="isClub ? 'Club vs Club' : 'Player rotation'">
      <template #actions>
        <button type="button" class="action-button" @click="openShare">
          <AppIcon name="share" /> Share
        </button>
        <button v-if="!game?.completed" type="button" class="action-button ghost" @click="finishSession">
          End session
        </button>
        <button v-else type="button" class="action-button primary" @click="openScoreboard">
          View results
        </button>
      </template>
    </PageHeading>

    <!-- Bottom tab bar -->
    <nav class="tab-bar" aria-label="Session tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        :aria-pressed="activeTab === tab.id"
        @click="selectTab(tab.id)"
      >
        <AppIcon :name="tab.icon" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>
    <!-- Score pane: scoreboard for the current round -->
    <div v-show="activeTab === 'skor'" class="tab-pane">
      <div class="round-summary">
        <h2>{{ roundLabel }} {{ currentRound + 1 }} of {{ totalRounds }}</h2>
        <span class="round-progress"><AppIcon name="check" /> {{ confirmedInRound }} of {{ round?.courts.length || 0 }} confirmed</span>
      </div>
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
          :aria-current="i === currentRound ? 'step' : undefined"
          @click="currentRound = i"
        >
          {{ roundLabel }} {{ i + 1 }}
        </button>
      </div>

      <p v-if="!isClub && round" class="resting">
        <strong><AppIcon name="players" /> Resting this round</strong>
        <span>{{ restingNames.length ? restingNames.join(', ') : 'All active players are playing' }}</span>
      </p>
      <!-- Court cards for current round -->
      <div class="courts" v-if="round" :key="round.num" :class="{ 'single-court': round.courts.length === 1 }">
        <div
          v-for="court in round.courts"
          :key="court.court"
          :id="'lapangan-' + court.court"
          class="court-card surface"
          tabindex="-1"
        >
          <div class="court-header">
            <h3>{{ isSingleCourtClub ? 'Match ' + round.num : 'Court ' + court.court }}</h3>
            <StatusBadge role="status" :tone="courtStatusTones[getCourtStatus(court, game)]">
              {{ matchStatusLabels[getCourtStatus(court, game)] }}
            </StatusBadge>
          </div>

          <div class="court-scoreboard">
            <div class="score-row">
              <template v-for="(pair, sideIndex) in [court.pair1, court.pair2]" :key="sideIndex">
                <span v-if="sideIndex === 1" class="sb-vs">VS</span>
                <div class="sb-players">
                  <strong v-if="isClub" class="sb-club-name">{{ clubByPlayer.get(pair[0])?.name }}</strong>
                  <span v-for="pid in pair" :key="pid" class="sb-player-name">{{ playerName(pid) }}</span>
                </div>
              </template>
            </div>

            <section v-for="(set, setIndex) in getMatchSets(court)" :key="set.id ?? 0" class="court-set" :aria-label="'Set ' + (setIndex + 1)">
              <div v-if="court.extraSets?.length" class="court-set-heading">
                <strong>Set {{ setIndex + 1 }}</strong>
                <button
                  v-if="setIndex > 0 && !hasSetScore(set) && !court.confirmed && !game.completed"
                  class="remove-set-btn"
                  @click="removeSet(court.court, set.id)"
                >Remove set</button>
              </div>

              <div class="score-row">
                <ScoreControl
                  v-for="side in scoreSides"
                  :key="side"
                  :button-id="scoreButtonId(court.court, set.id, side)"
                  :round-number="round.num"
                  :score="set[side]"
                  :pair="pairNames(court, side)"
                  :locked="game.completed || court.confirmed === true"
                  @adjust="adjustScore(court.court, set.id ?? null, side, $event)"
                  @score="(value, roundNumber) => editScore(roundNumber, court.court, set.id ?? null, side, value)"
                />
              </div>
            </section>
          </div>
          <footer v-if="!game.completed" class="court-actions">
            <button v-if="court.confirmed" type="button" class="action-button court-result-action" @click="reopenResult(court.court)">
              Correct result
            </button>
            <template v-else>
              <p v-if="getCourtStatus(court, game) === 'live' && !canConfirmResult(court)" class="score-hint">
                {{ resultHint(court) }}
              </p>
              <button type="button" class="action-button" @click="addSet(court.court)">Add set</button>
              <button type="button" class="action-button primary court-result-action" :disabled="!canConfirmResult(court)" @click="confirmResult(court.court)">
                Confirm result
              </button>
            </template>
          </footer>
        </div>
      </div>

      <div class="rotation-actions">
        <button
          v-if="!isClub && !game?.completed && currentRound === totalRounds - 1"
          class="action-button"
          @click="requestAddRound"
        >
          Add round
        </button>
      </div>
    </div>

    <!-- Players pane: edit players mid-game -->
    <div v-show="activeTab === 'pemain'" class="tab-pane roster-pane surface">
      <h2 class="section-title">Active players ({{ activePlayers.length }})</h2>
      <div v-for="group in playerGroups" :key="group.id" class="player-list">
        <h3 v-if="group.label" class="player-group-label">{{ group.label }}</h3>
        <div v-for="(p, idx) in group.players" :key="p.id" class="player-row">
          <span class="player-num">{{ idx + 1 }}</span>
          <input
            class="input player-input"
            :value="p.name"
            :placeholder="'Player ' + (idx + 1)"
            :aria-label="(group.label ? group.label + ' · ' : '') + 'Player ' + (idx + 1)"
            :disabled="game?.completed"
            @blur="renamePlayer(p.id, $event.target.value)"
            @keyup.enter="$event.target.blur()"
          />
          <button
            v-if="!isClub"
            class="action-button ghost icon player-remove"
            :disabled="game?.completed || activePlayers.length <= minPlayers"
            @click="requestDelete(p)"
            :aria-label="'Remove ' + p.name + ' from rotation'"
          ><AppIcon name="close" /></button>
        </div>
      </div>
      <button
        v-if="!isClub && !game?.completed"
        class="action-button"
        @click="openAddPlayer"
      >
        Add player
      </button>
      <p v-if="!isClub && activePlayers.length <= minPlayers" class="error-hint">
        At least {{ minPlayers }} players required for {{ game?.numCourts }} {{ game?.numCourts === 1 ? 'court' : 'courts' }}.
      </p>

      <div v-if="!isClub && inactivePlayers.length" class="inactive-section">
        <h3 class="section-title">Inactive players ({{ inactivePlayers.length }})</h3>
        <div v-for="p in inactivePlayers" :key="p.id" class="player-row row-inactive">
          <span class="player-num">—</span>
          <span class="inactive-name">{{ p.name || 'P' + p.id }}</span>
          <button
            class="action-button ghost icon restore-btn"
            :disabled="game?.completed"
            @click="restorePlayer(p)"
            :aria-label="'Restore ' + p.name + ' to rotation'"
          ><AppIcon name="plus" /></button>
        </div>
      </div>

      <p v-if="game?.completed" class="confirm-text">Reopen the session to edit players.</p>
    </div>

    <!-- Standings pane -->
    <div v-show="activeTab === 'klasemen'" class="tab-pane standings-pane">
      <StandingsTable :game-id="gameId" />

      <MatchHistory :matches="confirmedMatches" :single-court-club="isSingleCourtClub" />
    </div>

    <!-- Add Round Confirmation Modal -->
    <AppDialog v-if="showAddRoundConfirm" title="Add round?" @close="showAddRoundConfirm = false">
      <p class="confirm-text">Round {{ totalRounds + 1 }} will rotate players based on their earlier matches.</p>
      <template #actions>
        <button class="action-button" @click="showAddRoundConfirm = false">Cancel</button>
        <button class="action-button primary" @click="confirmAddRound">Add round</button>
      </template>
    </AppDialog>

    <AppDialog v-if="showFinishConfirm" title="End session?" @close="showFinishConfirm = false">
      <template v-if="unfinishedMatches.length">
        <p class="confirm-text">{{ unfinishedMatches.length }} {{ unfinishedMatches.length === 1 ? 'match needs' : 'matches need' }} confirmation.</p>
        <ul class="unfinished-list">
          <li v-for="match in unfinishedMatches" :key="match.key">
            <button type="button" class="action-button" @click="goToUnfinishedMatch(match)">
              {{ matchLocation(match) }}
            </button>
          </li>
        </ul>
        <p class="confirm-text">{{ isClub
          ? 'Confirm every result before ending this club session.'
          : 'The final standings will include only confirmed results.' }}</p>
      </template>
      <p v-else class="confirm-text">All results are confirmed. You can reopen the session to correct a result.</p>
      <template #actions>
        <button type="button" class="action-button" @click="showFinishConfirm = false">Cancel</button>
        <button type="button" class="action-button danger" :disabled="isClub && !!unfinishedMatches.length" @click="confirmFinish">
          {{ unfinishedMatches.length && !isClub ? 'End with confirmed results' : 'End session' }}
        </button>
      </template>
    </AppDialog>

    <!-- Delete Player Confirmation Modal -->
    <AppDialog v-if="deleteTarget" title="Remove player?" @close="deleteTarget = null">
      <p class="confirm-text">
        <b>{{ deleteTarget.name || 'P' + deleteTarget.id }}</b> will leave the rotation. Previous rounds and scores are saved.
        <span v-if="regeneratedFrom < totalRounds">
          Rounds {{ regeneratedFrom + 1 }}–{{ totalRounds }} will be rescheduled.
        </span>
      </p>
      <template #actions>
        <button class="action-button" @click="deleteTarget = null">Cancel</button>
        <button class="action-button danger" @click="confirmDelete">Remove</button>
      </template>
    </AppDialog>

    <!-- Add Player Modal -->
    <AppDialog v-if="showAddPlayer" title="Add player" @close="showAddPlayer = false">
      <input
        ref="addPlayerInput"
        class="input player-input"
        v-model="newPlayerName"
        aria-label="Player name"
        placeholder="Player name"
        @keyup.enter="confirmAddPlayer"
      />
      <p class="confirm-text add-player-note">The new player will join in upcoming rounds.</p>
      <template #actions>
        <button class="action-button" @click="showAddPlayer = false">Cancel</button>
        <button class="action-button primary" :disabled="!newPlayerName.trim()" @click="confirmAddPlayer">Save</button>
      </template>
    </AppDialog>

    <!-- Share Modal -->
    <ShareModal
      v-if="showShareModal"
      :url="shareUrl"
      :status="getSyncStatus(gameId)"
      @retry="shareGame(gameId)"
      @close="showShareModal = false"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useStorage } from '../composables/useStorage.js'
import { useStandings } from '../composables/useStandings.js'
import { getCourtStatus, getFinalMatchResult, getMatchResult, getMatchSets, hasSetScore, matchStatusLabels } from '../composables/matchScores.js'
import AppDialog from '../components/AppDialog.vue'
import AppIcon from '../components/AppIcon.vue'
import { generateId, generateNextRound, regenerateRemainingRounds, computeKeptCount } from '../composables/useRotation.js'
import MatchHistory from '../components/MatchHistory.vue'
import PageHeading from '../components/PageHeading.vue'
import ScoreControl from '../components/ScoreControl.vue'
import StatusBadge from '../components/StatusBadge.vue'
import ShareModal from '../components/ShareModal.vue'
import StandingsTable from '../components/StandingsTable.vue'

const props = defineProps({
  gameId: { type: String, required: true },
})
const router = useRouter()

const { getGame, updateGame, getSyncStatus, shareGame } = useStorage()
const game = computed(() => getGame(props.gameId))
const isClub = computed(() => game.value?.mode === 'club')
const isSingleCourtClub = computed(() => isClub.value && game.value.numCourts === 1)
const { allMatches, confirmedMatches, clubByPlayer } = useStandings(game)
const unfinishedMatches = computed(() => allMatches.value.filter((match) => !match.confirmed))
const roundLabel = computed(() => isSingleCourtClub.value ? 'Match' : 'Round')
const roundKey = 'badminscore:round:' + props.gameId
const lastRound = Number(sessionStorage.getItem(roundKey)) || 0
const currentRound = ref(Math.max(0, Math.min(lastRound, (game.value?.rounds.length || 1) - 1)))
const showFinishConfirm = ref(false)
const showAddRoundConfirm = ref(false)

// Bottom tab bar state
const tabs = [
  { id: 'pemain', icon: 'players', label: 'Players' },
  { id: 'skor', icon: 'score', label: 'Score' },
  { id: 'klasemen', icon: 'ranking', label: 'Standings' },
]
const activeTab = ref('skor')

// Player editing state
const deleteTarget = ref(null)
const showAddPlayer = ref(false)
const newPlayerName = ref('')
const addPlayerInput = ref(null)

// Scoreboard inline edit state
const scoreSides = ['score1', 'score2']
const courtStatusTones = { live: 'active', finished: 'success' }

// Share state
const showShareModal = ref(false)
const shareUrl = ref('')

const totalRounds = computed(() => game.value?.rounds.length || 0)
const round = computed(() => game.value?.rounds[currentRound.value] || null)
const restingNames = computed(() => (round.value?.resting || []).map(playerName))
const confirmedInRound = computed(() =>
  round.value?.courts.filter((court) => getFinalMatchResult(court, game.value)).length || 0
)
const roundNavRef = ref(null)
const scrollLeftHint = ref(false)
const scrollRightHint = ref(false)

// --- Player editing ---

const activePlayers = computed(() => (game.value?.players || []).filter((p) => !p.inactive))
const playerGroups = computed(() => {
  if (!isClub.value) return [{ id: 'rotation', players: activePlayers.value }]
  const players = new Map(activePlayers.value.map((player) => [player.id, player]))
  return game.value.clubs.flatMap((club) => club.teams.map((team, index) => ({
    id: team.id,
    label: club.name + ' · Team ' + (index + 1),
    players: team.playerIds.map((id) => players.get(id)),
  })))
})
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
    alert('Could not reschedule the rounds. Try again.')
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
  if (!game.value || game.value.completed) return
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
    alert('Enter a player name.')
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
    if (!el) return
    const strip = roundNavRef.value
    const chip = el.getBoundingClientRect()
    const viewport = strip.getBoundingClientRect()
    if (chip.left < viewport.left) strip.scrollLeft += chip.left - viewport.left
    if (chip.right > viewport.right) strip.scrollLeft += chip.right - viewport.right
    updateScrollHints()
  })
}

watch(currentRound, (index) => {
  sessionStorage.setItem(roundKey, String(index))
  scrollActiveRoundIntoView()
})

// Re-evaluate hints when rounds are added/removed (strip may become scrollable)
watch(totalRounds, (count) => {
  currentRound.value = Math.min(currentRound.value, Math.max(0, count - 1))
  nextTick(updateScrollHints)
})

// --- Scoreboard inline controls ---

function updateCourt(roundIndex, courtNum, update) {
  if (!game.value || game.value.completed) return
  const rounds = JSON.parse(JSON.stringify(game.value.rounds))
  const court = rounds[roundIndex]?.courts.find((item) => item.court === courtNum)
  if (!court || update(court) === false) return
  updateGame(props.gameId, { rounds })
}

function addSet(courtNum) {
  updateCourt(currentRound.value, courtNum, (court) => {
    if (court.confirmed) return false
    court.extraSets ??= []
    court.extraSets.push({ id: generateId(), score1: null, score2: null })
  })
}

function removeSet(courtNum, setId) {
  updateCourt(currentRound.value, courtNum, (court) => {
    const index = court.extraSets?.findIndex((set) => set.id === setId) ?? -1
    if (court.confirmed || index < 0 || hasSetScore(court.extraSets[index])) return false
    court.extraSets.splice(index, 1)
  })
}

function findScoreSet(court, setId) {
  return setId === null ? court : court.extraSets?.find((set) => set.id === setId)
}

function adjustScore(courtNum, setId, side, delta) {
  updateCourt(currentRound.value, courtNum, (court) => {
    const set = findScoreSet(court, setId)
    if (court.confirmed || !set || (delta < 0 && !set[side])) return false
    setScore(set, side, (set[side] ?? 0) + delta)
  })
}

function editScore(roundNumber, courtNum, setId, side, value) {
  const roundIndex = game.value.rounds.findIndex((item) => item.num === roundNumber)
  updateCourt(roundIndex, courtNum, (court) => {
    const set = findScoreSet(court, setId)
    if (court.confirmed || !set) return false
    setScore(set, side, value)
  })
}

function scoreButtonId(courtNum, setId, side) {
  return `score-${courtNum}-${setId ?? 'first'}-${side}`
}

function pairNames(court, side) {
  return (side === 'score1' ? court.pair1 : court.pair2).map(playerName).join(' and ')
}

function setScore(set, side, score) {
  if (!Number.isFinite(score)) {
    set[side] = null
    return
  }
  set[side] = Math.max(0, Math.trunc(score))
}

// --- Share ---

function openShare() {
  const { href } = router.resolve({ name: 'rotation', params: { gameId: props.gameId } })
  shareUrl.value = new URL(href, window.location.href).href
  shareGame(props.gameId)
  showShareModal.value = true
}

// --- Finish session ---

function finishSession() {
  showFinishConfirm.value = true
}

function canConfirmResult(court) {
  return !!getMatchResult(getMatchSets(court), !isClub.value)
}

function resultHint(court) {
  const incomplete = getMatchSets(court).some((set) => set.score1 == null || set.score2 == null)
  return incomplete ? 'Enter both scores in every set, including zero as needed.'
    : 'Check any tied scores or add a deciding set.'
}

function confirmResult(courtNum) {
  updateCourt(currentRound.value, courtNum, (court) => {
    if (court.confirmed || !canConfirmResult(court)) return false
    court.confirmed = true
  })
  nextTick(() => document.querySelector(`#lapangan-${courtNum} .court-result-action`)?.focus({ preventScroll: true }))
}

function reopenResult(courtNum) {
  updateCourt(currentRound.value, courtNum, (court) => {
    court.confirmed = false
  })
  nextTick(() => document.getElementById(scoreButtonId(courtNum, null, 'score1'))?.focus())
}

function matchLocation(match) {
  return isSingleCourtClub.value ? 'Match ' + match.round : `Round ${match.round} · Court ${match.court}`
}

function goToUnfinishedMatch(match) {
  showFinishConfirm.value = false
  activeTab.value = 'skor'
  currentRound.value = game.value.rounds.findIndex((item) => item.num === match.round)
  nextTick(() => document.getElementById('lapangan-' + match.court)?.focus())
}

function selectTab(id) {
  if (activeTab.value === id) return
  activeTab.value = id
  window.scrollTo({ top: 0 })
  if (id === 'skor') scrollActiveRoundIntoView()
}

function confirmFinish() {
  if (!game.value || (isClub.value && unfinishedMatches.value.length)) return

  const rounds = game.value.rounds.map((item) => ({
    ...item,
    courts: item.courts.map((court) => ({ ...court, confirmed: court.confirmed === true })),
  }))
  updateGame(props.gameId, { completed: true, rounds })
  showFinishConfirm.value = false
  openScoreboard()
}

function openScoreboard() {
  router.replace({ name: 'scoreboard', params: { gameId: props.gameId } })
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
    alert('Could not create a new round. Try again.')
    return
  }

  const rounds = [...game.value.rounds, newRound]
  updateGame(props.gameId, { rounds })

  // Navigate to the new round
  currentRound.value = rounds.length - 1
}

let resizeObserver = null

onMounted(() => {
  scrollActiveRoundIntoView()
  resizeObserver = new ResizeObserver(updateScrollHints)
  if (roundNavRef.value) resizeObserver.observe(roundNavRef.value)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>

<style scoped>
.rotation { padding-bottom: calc(88px + env(safe-area-inset-bottom)); }

.tab-bar {
  position: fixed;
  inset: auto 0 0;
  z-index: 50;
  display: flex;
  padding: 4px var(--page-gutter) max(4px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: var(--card-bg);
}

.tab-btn {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-height: 52px;
  padding: 5px 12px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.tab-btn.active { background: var(--primary-bg); color: var(--primary); }
.round-summary { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px 16px; margin-bottom: 12px; }
.round-summary h2 { font-size: 22px; font-weight: 800; }
.round-progress, .resting { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; color: var(--text-secondary); font-size: 14px; }
.round-progress { gap: 5px; }
.round-progress :deep(svg), .resting :deep(svg) { width: 16px; height: 16px; color: var(--primary); }
.resting { padding: 10px 12px; margin: 4px 0 16px; border: 1px solid var(--border); border-radius: var(--radius-control); background: var(--card-bg); }
.resting strong { display: inline-flex; align-items: center; gap: 7px; color: var(--text-primary); }

.round-nav-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 10px;
  padding-bottom: 4px;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
}
.round-nav-scroll.fade-right { mask-image: linear-gradient(to right, black calc(100% - 16px), transparent); }
.round-nav-scroll.fade-left { mask-image: linear-gradient(to left, black calc(100% - 16px), transparent); }
.round-nav-scroll.fade-left.fade-right { mask-image: linear-gradient(90deg, transparent, black 16px, black calc(100% - 16px), transparent); }

.round-chip {
  flex-shrink: 0;
  min-height: var(--size-control);
  padding: 6px 15px;
  scroll-snap-align: start;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-control);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.round-chip:hover { background: var(--surface-raised); }
.round-chip:focus-visible { outline-offset: -3px; }
.round-chip.active { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
.round-chip.active:focus-visible { outline-color: var(--on-primary); }

.courts { display: grid; align-items: start; gap: 14px; margin-bottom: 16px; }
.court-card { container-type: inline-size; scroll-margin-top: 80px; }
.court-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 16px; }
.court-header h3 { font-size: 16px; }
.court-scoreboard {
  margin: 0 10px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--input-bg);
}
.court-scoreboard:last-child { margin-bottom: 10px; }
.score-row { position: relative; display: flex; align-items: center; gap: 12px; }
.sb-players { flex: 1; min-width: 0; display: grid; justify-items: center; gap: 2px; padding: 2px 6px; }
.sb-player-name, .sb-club-name { overflow-wrap: anywhere; text-align: center; }
.sb-player-name { font-size: 14px; font-weight: 700; }
.sb-club-name { color: var(--primary); font-size: 12px; }
.sb-vs { position: absolute; left: 50%; transform: translateX(-50%); color: var(--text-secondary); font-size: 10px; font-weight: 800; }
.court-set { margin-top: 6px; }
.court-set + .court-set { padding-top: 8px; border-top: 1px solid var(--border); }
.court-set-heading { display: flex; align-items: center; justify-content: space-between; color: var(--text-secondary); font-size: 13px; }
.remove-set-btn { min-height: var(--size-control); padding-inline: 8px; border: 0; border-radius: var(--radius-control); background: none; color: var(--danger); cursor: pointer; }
.court-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; padding: 10px; }
.court-actions button { flex: 1; }
.score-hint { flex-basis: 100%; color: var(--text-secondary); font-size: 13px; }

.roster-pane { max-width: 42rem; padding: 16px; }
.roster-pane .section-title { margin-bottom: 12px; }
.player-group-label { font-size: 14px; overflow-wrap: anywhere; }
.player-remove, .error-hint { color: var(--danger); }
.error-hint { margin-top: 8px; font-size: 13px; }
.inactive-section { margin-top: 20px; }
.inactive-name { flex: 1; color: var(--text-secondary); }
.restore-btn { color: var(--primary); }

.standings-pane { display: grid; gap: 24px; align-items: start; }
.confirm-text { color: var(--text-secondary); }
.add-player-note { margin-top: 8px; }
.unfinished-list { display: grid; gap: 6px; margin: 12px 0; list-style: none; }
.unfinished-list button { width: 100%; justify-content: flex-start; }

@media (min-width: 650px) {
  .courts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .courts.single-court { grid-template-columns: minmax(0, 34rem); }
}

@media (min-width: 760px) {
  .rotation { padding-bottom: 44px; }
  .tab-bar {
    position: static;
    width: fit-content;
    gap: 4px;
    padding: 4px;
    margin-bottom: 26px;
    border: 1px solid var(--border);
    border-radius: 11px;
  }
  .tab-btn { flex: 0 0 auto; flex-direction: row; gap: 8px; min-height: 44px; font-size: 14px; }
}

@media (min-width: 1040px) {
  .courts:not(.single-court) { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
  .standings-pane { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); }
}
</style>
