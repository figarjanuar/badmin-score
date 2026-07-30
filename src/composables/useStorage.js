import { reactive } from 'vue'

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
    state.games.unshift(game)
    persist()
  }

  function updateGame(id, updates) {
    const idx = state.games.findIndex((g) => g.id === id)
    if (idx !== -1) {
      Object.assign(state.games[idx], updates)
      persist()
    }
  }

  function deleteGame(id) {
    state.games = state.games.filter((g) => g.id !== id)
    persist()
  }

  function persist() {
    save(state)
  }

  return { getGames, getGame, addGame, updateGame, deleteGame }
}
