import { reactive } from 'vue'
import { firebaseReady } from '../config/firebase.js'
import { pushGame, publishGame, pullGame, syncGame, updateGameFirestore, deleteGameFirestore, listGamesPage } from './useFirestore.js'

const STORAGE_KEY = 'badminscore'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { games: [] }
  } catch {
    return { games: [] }
  }
}

const state = reactive({ outbox: {}, ...load() })
const syncStates = reactive(new Map())
const online = reactive({ value: navigator.onLine })
const pending = new Set()
const pendingRemoteDeletions = new Set()

function syncPendingGames() {
  for (const id of Object.keys(state.outbox)) flush(id)
}

window.addEventListener('online', () => {
  online.value = true
  syncPendingGames()
})
window.addEventListener('offline', () => { online.value = false })

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

async function writeChanges(game, entry) {
  if (!entry) return publishGame(game)
  if (entry.create) return pushGame(game)

  try {
    await updateGameFirestore(game.id, entry.updates)
  } catch (err) {
    if (err.code !== 'not-found') throw err
    const remote = await pullGame(game.id)
    if (remote) return updateGameFirestore(game.id, entry.updates)
    await publishGame(game)
  }
}

async function flush(id) {
  const game = state.games.find((item) => item.id === id)
  if (!game || !firebaseReady || !online.value || pending.has(id)) return

  const entry = state.outbox[id]
  syncStates.set(id, 'pending')
  pending.add(id)
  let completed = false
  try {
    await writeChanges(game, entry)
    if (!state.games.includes(game)) return

    completed = true
    if (state.outbox[id] === entry) {
      delete state.outbox[id]
      syncStates.set(id, 'ready')
      persist()
    }
  } catch (err) {
    if (state.games.includes(game)) syncStates.set(id, 'error')
    console.warn('Firestore write failed:', err)
  } finally {
    pending.delete(id)
    if (pendingRemoteDeletions.delete(id)) {
      removeRemoteGame(id)
    } else if (state.outbox[id] && (completed || !state.games.includes(game))) {
      flush(id)
    }
  }
}

function removeRemoteGame(id) {
  deleteGameFirestore(id).catch((err) => console.warn('Firestore delete failed:', err))
}

syncPendingGames()

export function useStorage() {
  function getGames() {
    return state.games
  }

  function getGame(id) {
    return state.games.find((game) => game.id === id) || null
  }

  function getSyncStatus(id) {
    if (!firebaseReady || !online.value) return 'local'
    return syncStates.get(id) || 'local'
  }

  function addGame(game) {
    state.games.unshift(game)
    if (firebaseReady) state.outbox[game.id] = { create: true }
    persist()
    flush(game.id)
  }

  function updateGame(id, updates) {
    const game = getGame(id)
    if (!game) return

    Object.assign(game, updates)
    if (firebaseReady) {
      const entry = state.outbox[id]
      state.outbox[id] = entry?.create
        ? { create: true }
        : { updates: { ...entry?.updates, ...updates } }
    }
    persist()
    flush(id)
  }

  function shareGame(id) {
    if (getSyncStatus(id) !== 'ready') flush(id)
  }

  function deleteGame(id, { deviceOnly = false } = {}) {
    state.games = state.games.filter((game) => game.id !== id)
    delete state.outbox[id]
    syncStates.delete(id)
    sessionStorage.removeItem('badminscore:round:' + id)
    persist()

    if (!deviceOnly) {
      if (pending.has(id)) pendingRemoteDeletions.add(id)
      else removeRemoteGame(id)
    }
  }

  async function loadRemoteGame(gameId) {
    const local = getGame(gameId)
    if (local) return local

    const remote = await pullGame(gameId)
    if (remote && !getGame(gameId)) {
      state.games.unshift(remote)
      syncStates.set(gameId, 'ready')
      persist()
    }
    return remote
  }

  function subscribeToGame(gameId, callback) {
    if (state.outbox[gameId]) flush(gameId)
    return syncGame(gameId, (updatedGame) => {
      const game = getGame(gameId)
      if (!game || state.outbox[gameId]) return

      Object.assign(game, updatedGame)
      syncStates.set(gameId, 'ready')
      persist()
      callback?.(game)
    })
  }

  return {
    getGames,
    listGamesPage,
    getGame,
    getSyncStatus,
    addGame,
    updateGame,
    shareGame,
    deleteGame,
    loadRemoteGame,
    subscribeToGame,
  }
}
