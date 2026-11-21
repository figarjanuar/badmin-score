<template>
  <section class="page">
    <PageHeading title="Matches">
      <template #actions>
        <button class="action-button" type="button" :disabled="signingOut" @click="logout">Sign out</button>
      </template>
    </PageHeading>

    <p v-if="logoutError" class="admin-error" role="alert">{{ logoutError }}</p>
    <div class="surface">
      <div class="table-scroll" role="region" aria-label="Matches table" tabindex="0">
        <table :aria-busy="loading">
          <thead>
            <tr>
              <th scope="col">Match</th>
              <th scope="col">Created</th>
              <th scope="col">Created by</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" role="status">Loading matches…</td>
            </tr>
            <tr v-else-if="loadError">
              <td colspan="5">
                <p class="admin-error" role="alert">{{ loadError }}</p>
                <button type="button" class="action-button" @click="loadPage(requestedPage)">Retry</button>
              </td>
            </tr>
            <tr v-else-if="!games.length">
              <td class="muted" colspan="5">{{ pageIndex ? 'No matches on this page.' : 'No matches found in Firebase.' }}</td>
            </tr>
            <tr v-for="game in visibleGames" :key="game.id">
              <th scope="row">
                {{ gameName(game) }}
                <span class="match-mode muted">{{ getSessionModeLabel(game.mode) }}</span>
              </th>
              <td>{{ formatDate(game.createdAt) }}</td>
              <td class="creator-name">{{ game.createdBy || '—' }}</td>
              <td><StatusBadge :tone="game.completed ? 'success' : 'active'">{{ game.completed ? 'Completed' : 'In progress' }}</StatusBadge></td>
              <td>
                <div class="row-actions">
                  <button type="button" class="action-button" :aria-label="'Details for ' + gameName(game)" @click="selected = game">Details</button>
                  <RouterLink class="action-button primary" :to="matchRoute(game)" :aria-label="'Open ' + gameName(game)">Open match</RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav v-if="pageIndex || nextCursor" class="pagination" aria-label="Match pages">
        <span class="muted" aria-live="polite">Page {{ pageIndex + 1 }}</span>
        <div class="row-actions">
          <button type="button" class="action-button" :disabled="loading || pageIndex === 0" @click="loadPage(pageIndex - 1)">Previous</button>
          <button type="button" class="action-button" :disabled="loading || !nextCursor" @click="loadPage(pageIndex + 1)">Next</button>
        </div>
      </nav>
    </div>

    <AppDialog v-if="selected" :title="gameName(selected)" @close="selected = null">
      <dl class="match-details">
        <dt>Match ID</dt><dd>{{ selected.id }}</dd>
        <dt>Created</dt><dd>{{ formatDate(selected.createdAt) }}</dd>
        <dt>Created by</dt><dd>{{ selected.createdBy || '—' }}</dd>
        <dt>Mode</dt><dd>{{ getSessionModeLabel(selected.mode) }}</dd>
        <dt>Status</dt><dd>{{ selected.completed ? 'Completed' : 'In progress' }}</dd>
        <dt>Courts</dt><dd>{{ selected.numCourts ?? '—' }}</dd>
        <dt>Rounds</dt><dd>{{ selected.rounds?.length ?? 0 }}</dd>
        <dt v-if="selected.clubs?.length">Clubs</dt>
        <dd v-if="selected.clubs?.length">{{ selected.clubs.map((club) => club.name).join(', ') }}</dd>
        <dt>Players</dt>
        <dd>{{ selected.players?.map((player) => player.name).filter(Boolean).join(', ') || '—' }}</dd>
      </dl>
      <template #actions>
        <RouterLink class="action-button primary" :to="matchRoute(selected)">Open match</RouterLink>
      </template>
    </AppDialog>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import AppDialog from '../components/AppDialog.vue'
import PageHeading from '../components/PageHeading.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { hasAdminSession, signOutAdmin } from '../composables/adminAuth.js'
import { useStorage } from '../composables/useStorage.js'
import { getSessionModeLabel } from '../composables/sessionModes.js'

const router = useRouter()
const { listGamesPage } = useStorage()
const games = shallowRef([])
const selected = shallowRef(null)
const loading = ref(true)
const loadError = ref('')
const logoutError = ref('')
const signingOut = ref(false)
const pageIndex = ref(0)
const requestedPage = ref(0)
const nextCursor = shallowRef(null)
const cursors = [null]
const visibleGames = computed(() => loading.value || loadError.value ? [] : games.value)
const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

function formatDate(value) {
  const date = value?.toDate?.() ?? new Date(value ?? NaN)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

function gameName(game) {
  return game.name || 'Untitled match'
}

function matchRoute(game) {
  return { name: game.completed ? 'scoreboard' : 'rotation', params: { gameId: game.id } }
}

async function loadPage(index) {
  requestedPage.value = index
  loading.value = true
  loadError.value = ''

  try {
    const page = await listGamesPage(cursors[index])
    games.value = page.games
    nextCursor.value = page.nextCursor
    pageIndex.value = index
    cursors.splice(index + 1, cursors.length, page.nextCursor)
  } catch (err) {
    if (err.code === 'permission-denied' && !(await hasAdminSession().catch(() => false))) {
      await router.replace({ name: 'admin-login' })
    } else {
      loadError.value = 'Could not load matches. Try again.'
    }
  } finally {
    loading.value = false
  }
}

async function logout() {
  signingOut.value = true
  logoutError.value = ''
  try {
    await signOutAdmin()
    await router.replace({ name: 'admin-login' })
  } catch {
    logoutError.value = 'Could not sign out. Try again.'
  } finally {
    signingOut.value = false
  }
}

onMounted(() => loadPage(0))
</script>

<style scoped>
.table-scroll { overflow-x: auto; border-radius: var(--radius-panel); }

table {
  width: 100%;
  border-collapse: collapse;
  text-align: start;
}

th, td {
  padding: 12px 16px;
  text-align: start;
}

thead {
  background: var(--surface-raised);
  color: var(--text-secondary);
  font-size: 14px;
}

tbody tr { border-top: 1px solid var(--border); }
tbody th { min-width: 170px; overflow-wrap: anywhere; }
.match-mode { display: block; font-size: 13px; font-weight: 400; }
.creator-name { min-width: 100px; overflow-wrap: anywhere; }
.row-actions { display: flex; gap: 8px; white-space: nowrap; }
.admin-error { margin-bottom: 8px; color: var(--danger); }

.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

.match-details {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px 16px;
}

.match-details dt { color: var(--text-secondary); }
.match-details dd { overflow-wrap: anywhere; }
</style>
