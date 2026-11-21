<template>
  <section class="page dashboard">
    <header class="dashboard-hero">
      <img class="hero-image" :src="courtPhoto" alt="" width="1280" height="853" fetchpriority="high" />
      <div class="hero-copy">
        <h1 class="page-title">Badminton<br />sessions<span>.</span></h1>
        <p>Schedule rotations, record scores, and review results.</p>
        <div class="hero-actions">
          <RouterLink class="action-button primary" :to="{ name: 'config' }">
            <AppIcon name="plus" /> New session
          </RouterLink>
          <button v-if="showInstallButton" class="action-button install-button" type="button" @click="handleInstall">
            <AppIcon name="download" /> Install app
          </button>
        </div>
      </div>
    </header>

    <section class="session-section" aria-labelledby="session-heading">
      <header class="session-heading">
        <h2 id="session-heading" class="section-title">Recent sessions</h2>
        <span v-if="games.length" class="muted">{{ games.length }} {{ games.length === 1 ? 'session' : 'sessions' }}</span>
      </header>
      <div v-if="!games.length" class="empty-state">
        <h3>No sessions yet</h3>
        <p>Set up a player rotation or a club match to get started.</p>
      </div>

      <div v-else class="game-list surface">
        <article v-for="{ game, confirmed, total } in sessions" :key="game.id" class="game-card">
          <div class="game-heading">
            <span class="game-icon"><AppIcon :name="game.mode === 'club' ? 'players' : 'court'" /></span>
            <div class="game-identity">
              <p class="game-mode">{{ game.mode === 'club' ? 'Club vs Club' : 'Player rotation' }} · {{ getMatchCategory(game.category).label }}</p>
              <h3>{{ game.name || 'Session ' + formatDate(game.createdAt) }}</h3>
              <p class="game-meta">
                <AppIcon name="calendar" />
                {{ formatDate(game.createdAt) }} · {{ game.numCourts }} {{ game.numCourts === 1 ? 'court' : 'courts' }}
              </p>
            </div>
          </div>
          <div class="game-progress" :data-completed="game.completed">
            <StatusBadge :tone="game.completed ? 'success' : 'active'">{{ game.completed ? 'Completed' : 'In progress' }}</StatusBadge>
            <progress v-if="total" :value="confirmed" :max="total" :aria-label="game.name + ' results confirmed'"></progress>
            <span class="game-meta">{{ confirmed }} of {{ total }} results confirmed</span>
          </div>
          <p class="game-meta game-sync" :data-sync="getSyncStatus(game.id)">
            <AppIcon name="cloud" /> {{ syncLabels[getSyncStatus(game.id)] }}
          </p>
          <div class="game-actions">
            <RouterLink class="action-button session-link" :to="{ name: game.completed ? 'scoreboard' : 'rotation', params: { gameId: game.id } }">
              {{ game.completed ? 'View results' : 'Resume session' }} <AppIcon name="arrow" />
            </RouterLink>
            <details class="game-menu">
              <summary class="action-button ghost icon" :aria-label="'Options for ' + game.name"><AppIcon name="more" /></summary>
              <button type="button" class="action-button" @click="gameToDelete = game">Delete session</button>
            </details>
          </div>
        </article>
      </div>
    </section>

    <AppDialog v-if="showIosHelp" title="Install app" @close="showIosHelp = false">
      <ol class="install-steps">
        <li>Open the <strong>Share</strong> menu in Safari.</li>
        <li>Choose <strong>Add to Home Screen</strong>.</li>
        <li>Tap <strong>Add</strong> to install BadminScore.</li>
      </ol>
      <template #actions>
        <button type="button" class="action-button primary" @click="showIosHelp = false">Got it</button>
      </template>
    </AppDialog>

    <AppDialog v-if="gameToDelete" title="Delete session?" @close="gameToDelete = null">
      <p><strong>{{ gameToDelete.name }}</strong></p>
      <p class="delete-description">Remove this session and any unsynced changes from this device. An existing shared copy stays online.</p>
      <p v-if="firebaseReady" class="delete-description">Delete everywhere also removes the shared copy once the server receives the request.</p>
      <template #actions>
        <button type="button" class="action-button" @click="gameToDelete = null">Cancel</button>
        <button type="button" class="action-button" @click="confirmDelete(true)">Remove from this device</button>
        <button v-if="firebaseReady" type="button" class="action-button danger" @click="confirmDelete(false)">Delete everywhere</button>
      </template>
    </AppDialog>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStorage } from '../composables/useStorage.js'
import { usePwaInstall } from '../composables/usePwaInstall.js'
import { firebaseReady } from '../config/firebase.js'
import { getFinalMatchResult } from '../composables/matchScores.js'
import { getMatchCategory } from '../composables/matchCategories.js'
import AppIcon from '../components/AppIcon.vue'
import AppDialog from '../components/AppDialog.vue'
import StatusBadge from '../components/StatusBadge.vue'
import courtPhoto from '../assets/court-hero.webp'

const { getGames, deleteGame, getSyncStatus } = useStorage()
const { showInstallButton, install } = usePwaInstall()
const showIosHelp = ref(false)
const gameToDelete = ref(null)
const games = computed(() => getGames())
const sessions = computed(() => [...games.value]
  .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
  .map((game) => {
    const courts = game.rounds.flatMap((round) => round.courts)
    return {
      game,
      total: courts.length,
      confirmed: courts.filter((court) => getFinalMatchResult(court, game)).length,
    }
  }))

const syncLabels = {
  local: 'Saved on this device',
  pending: 'Syncing…',
  ready: 'Saved online',
  error: 'Sync failed · Saved on this device',
}

function handleInstall() {
  if (!install()) showIosHelp.value = true
}

function confirmDelete(deviceOnly) {
  deleteGame(gameToDelete.value.id, { deviceOnly })
  gameToDelete.value = null
}

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}
</script>

<style scoped>
.dashboard-hero {
  position: relative;
  isolation: isolate;
  display: grid;
  min-height: clamp(320px, 36vw, 400px);
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-panel);
  background: #14241a;
}

.hero-image, .dashboard-hero::after {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
}

.hero-image { object-fit: cover; object-position: center 61%; }

.dashboard-hero::after {
  content: '';
  background: linear-gradient(90deg, #14241a 12%, rgb(20 36 26 / 92%) 30%, rgb(20 36 26 / 15%) 69%, transparent);
}

.hero-copy { padding: clamp(20px, 6vw, 56px); }
.hero-copy h1 { font-size: clamp(64px, 9vw, 112px); text-transform: uppercase; line-height: 0.82; }
.hero-copy h1 span { color: var(--primary); }
.hero-copy p { max-width: 31ch; margin-top: 20px; color: var(--text-primary); }
.hero-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }

.session-section { margin-top: clamp(28px, 4vw, 44px); }
.session-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.session-heading span { font-size: 13px; }

.game-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(120px, 0.5fr) 215px;
  align-items: center;
  gap: 12px 24px;
  padding: 18px;
}
.game-card + .game-card { border-top: 1px solid var(--border); }

.game-heading { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.game-icon {
  display: grid;
  flex: 0 0 44px;
  height: 44px;
  place-items: center;
  border-radius: var(--radius-control);
  background: var(--primary-bg);
  color: var(--primary);
}

.game-identity { min-width: 0; }
.game-identity h3 { font-size: 19px; line-height: 1.2; overflow-wrap: anywhere; }
.game-mode { margin-bottom: 3px; color: var(--primary); font-size: 11px; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; }
.game-meta { display: flex; gap: 5px; align-items: center; color: var(--text-secondary); font-size: 13px; }
.game-meta :deep(svg) { width: 15px; height: 15px; }
.game-identity .game-meta { margin-top: 5px; }
.game-sync { grid-column: 1 / -1; font-size: 12px; }
.game-meta[data-sync="error"] { color: var(--danger); }
.game-progress {
  --progress-color: var(--yellow);
  display: grid;
  gap: 6px;
  align-content: center;
}
.game-progress[data-completed="true"] { --progress-color: var(--green); }
.game-progress progress {
  appearance: none;
  width: min(100%, 164px);
  height: 5px;
  overflow: hidden;
  border: 0;
  border-radius: 4px;
  background: var(--tag-bg);
  color: var(--progress-color);
}
.game-progress progress::-webkit-progress-bar { background: var(--tag-bg); }
.game-progress progress::-webkit-progress-value { background: var(--progress-color); }
.game-progress progress::-moz-progress-bar { background: var(--progress-color); }
.game-actions { display: flex; align-items: center; justify-content: end; gap: 4px; grid-column: 3; grid-row: 1; }
.session-link { white-space: nowrap; }
.session-link :deep(svg) { width: 16px; height: 16px; }

.game-menu { position: relative; }
.game-menu summary { list-style: none; }
.game-menu summary::-webkit-details-marker { display: none; }
.game-menu button {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  z-index: 2;
  box-shadow: var(--shadow-popover);
  color: var(--danger);
  white-space: nowrap;
}
.install-steps { padding-left: 20px; }
.delete-description { margin-top: 8px; color: var(--text-secondary); }

@media (max-width: 700px) {
  .game-card { grid-template-columns: minmax(0, 1fr) auto; gap: 12px; }
  .game-heading, .game-progress, .game-sync { grid-column: 1 / -1; }
  .game-heading { grid-row: 1; padding-inline-end: 48px; }
  .game-progress { grid-row: 2; }
  .game-sync { grid-row: 3; }
  .game-actions { display: contents; }
  .game-menu { grid-column: 2; grid-row: 1; align-self: start; }
  .session-link { grid-column: 1 / -1; justify-self: start; grid-row: 4; }
}

@media (max-width: 550px) {
  .dashboard-hero { min-height: 310px; align-items: end; }
  .hero-image { object-position: 62% 25%; }
  .dashboard-hero::after { background: linear-gradient(0deg, #14241a 12%, rgb(20 36 26 / 91%) 33%, rgb(20 36 26 / 32%) 89%); }
  .hero-copy h1 { font-size: clamp(56px, 14vw, 74px); }
  .hero-copy p { font-size: 14px; margin-top: 12px; }
  .hero-actions { margin-top: 14px; }
}
</style>
