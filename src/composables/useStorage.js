import { reactive } from 'vue'
import { pushGame, pullGame, syncGame, updateGameFirestore, deleteGameFirestore } from './useFirestore.js'

const STORAGE_KEY = 'badminscore'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { games: [] }
  } catch {
    return { games: [] }
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const state = reactive(load())

export function useStorage() {
  function getGames() {
    return state.games
  }

  function getGame(id) {
    return state.games.find((g) => g.id === id) || null
  }

  function addGame(game) {
    state.games.unshift({ ...game, synced: false })
    persist()
    // Fire-and-forget: push to Firestore in background
    pushGame(game).then(() => {
      const idx = state.games.findIndex((g) => g.id === game.id)
      if (idx !== -1) state.games[idx].synced = true
      persist()
    }).catch((err) => {
      console.warn('Firestore push failed:', err)
    })
  }

  function updateGame(id, updates) {
    const idx = state.games.findIndex((g) => g.id === id)
    if (idx !== -1) {
      Object.assign(state.games[idx], updates)
      persist()
      // Fire-and-forget: sync to Firestore in background
      updateGameFirestore(id, updates).catch((err) => {
        console.warn('Firestore update failed:', err)
      })
    }
  }

  function deleteGame(id) {
    state.games = state.games.filter((g) => g.id !== id)
    persist()
    // Fire-and-forget: also delete from Firestore
    deleteGameFirestore(id).catch((err) => {
      console.warn('Firestore delete failed:', err)
    })
  }

  function persist() {
    save(state)
  }

  /**
   * Load a game from Firestore (for shared URL access).
   * Checks localStorage cache first.
   * @param {string} gameId
   * @returns {object|null} game or null if not found locally or remotely
   */
  async function loadRemoteGame(gameId) {
    // Check cache first — also works for existing localStorage games
    const local = getGame(gameId)
    if (local) return local

    // Fetch from Firestore
    try {
      const remote = await pullGame(gameId)
      if (remote) {
        // Ensure backward compat: remote games get added to local state
        state.games.unshift(remote)
        persist()
      }
      return remote
    } catch (err) {
      console.warn('Firestore pull failed:', err)
      return null
    }
  }

  /**
   * Subscribe to real-time updates from Firestore.
   * Updates are merged into the local reactive state automatically.
   * @param {string} gameId
   * @param {(game: object) => void} callback - called when remote update arrives
   * @returns {() => void} unsubscribe function
   */
  function subscribeToGame(gameId, callback) {
    return syncGame(gameId, (updatedGame) => {
      const idx = state.games.findIndex((g) => g.id === gameId)
      if (idx !== -1) {
        // Merge remote update into existing local game
        Object.assign(state.games[idx], updatedGame)
      } else {
        // Game not yet in local state — add it
        state.games.unshift(updatedGame)
      }
      persist()
      if (callback) callback(updatedGame)
    })
  }

  return {
    getGames,
    getGame,
    addGame,
    updateGame,
    deleteGame,
    loadRemoteGame,
    subscribeToGame,
  }
}
