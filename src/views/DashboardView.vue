<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="app-icon">🏸</div>
      <h1>BadminScore</h1>
      <p class="subtitle">Atur jadwal main badminton dengan adil</p>
    </div>

    <div v-if="games.length === 0" class="empty-state">
      <div class="empty-icon">🏸</div>
      <p class="empty-text">Belum ada game nih!</p>
      <p class="empty-hint">Buat game baru dan atur rotasi pemain dengan adil</p>
      <button class="btn btn-primary btn-large" @click="$emit('navigate', 'config')">
        ➕ Buat Game Baru
      </button>
    </div>

    <div v-else class="game-list">
      <div
        v-for="game in games"
        :key="game.id"
        class="game-card"
        @click="openGame(game.id)"
      >
        <div class="game-card-info">
          <div class="game-card-name">{{ game.name || 'Game ' + formatDate(game.createdAt) }}</div>
          <div class="game-card-meta">
            <span>{{ game.players.length }} pemain</span>
            <span class="meta-dot">·</span>
            <span>{{ game.numCourts }} lapangan</span>
            <span class="meta-dot">·</span>
            <span>{{ game.rounds.length }} ronde</span>
          </div>
        </div>
        <div class="game-card-status">
          <span v-if="game.completed" class="badge badge-done">Selesai</span>
          <span v-else class="badge badge-progress">Berjalan</span>
        </div>
      </div>
    </div>

    <button
      v-if="games.length > 0"
      class="fab"
      @click="$emit('navigate', 'config')"
    >
      ➕
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStorage } from '../composables/useStorage.js'

const emit = defineEmits(['navigate'])
const { getGames } = useStorage()

const games = computed(() => getGames())

function openGame(id) {
  const game = getGames().find((g) => g.id === id)
  const view = game?.completed ? 'scoreboard' : 'rotation'
  emit('navigate', view, id)
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.dashboard {
  padding: 24px 16px 80px;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 32px;
}

.app-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.dashboard-header h1 {
  font-size: 28px;
  margin: 0;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
  margin: 4px 0 0;
  font-size: 14px;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 48px 16px;
}

.empty-icon {
  font-size: 72px;
  margin-bottom: 16px;
  opacity: 0.4;
}

.empty-text {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.empty-hint {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0 0 32px;
}

/* Game list */
.game-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.game-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.15s;
}

.game-card:active {
  transform: scale(0.98);
}

.game-card-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.game-card-meta {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-dot {
  opacity: 0.4;
}

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  white-space: nowrap;
}

.badge-done {
  background: var(--green-bg);
  color: var(--green);
}

.badge-progress {
  background: var(--yellow-bg);
  color: var(--yellow);
}

/* FAB */
.fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: var(--primary);
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
}

.fab:active {
  transform: scale(0.92);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
}
.btn:active { opacity: 0.8; }
.btn-primary {
  background: var(--primary);
  color: #fff;
}
.btn-large {
  padding: 14px 32px;
  font-size: 18px;
  border-radius: 12px;
}
</style>
