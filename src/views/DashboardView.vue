<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="app-icon">🏸</div>
      <h1>BadminScore</h1>
      <p class="subtitle">Atur jadwal main badminton dengan adil</p>
      <button v-if="showInstallButton" class="btn btn-outline btn-install" @click="handleInstall">
        📲 Pasang Aplikasi
      </button>
    </div>

    <div v-if="games.length === 0" class="empty-state">
      <div class="empty-icon">🏸</div>
      <p class="empty-text">Belum ada game nih!</p>
      <p class="empty-hint">Buat game baru dan atur rotasi pemain dengan adil</p>
      <button class="btn btn-primary btn-large" @click="router.push({ name: 'config' })">
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
        </div>
        <div class="game-card-status">
          <span v-if="game.synced" class="badge badge-synced">☁️ Sync</span>
          <span v-if="game.completed" class="badge badge-done">Selesai</span>
          <span v-else class="badge badge-progress">Berjalan</span>
          <button
            class="delete-btn"
            title="Hapus game"
            @click.stop="askDelete(game)"
          >🗑️</button>
        </div>
      </div>
    </div>

    <!-- Install Help Modal (iOS) -->
    <div v-if="showIosHelp" class="modal-overlay" @click.self="showIosHelp = false">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">📲 Pasang Aplikasi</h2>
          <button class="modal-close" @click="showIosHelp = false">✕</button>
        </div>
        <div class="modal-body">
          <ol class="install-steps">
            <li>Buka menu <strong>Bagikan</strong> (ikon ⬆️) di Safari</li>
            <li>Pilih <strong>Add to Home Screen</strong></li>
            <li>Tekan <strong>Add</strong> — BadminScore terpasang di layar utama</li>
          </ol>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="showIosHelp = false">Mengerti</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="gameToDelete" class="modal-overlay" @click.self="gameToDelete = null">
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">🗑️ Hapus Game?</h2>
          <button class="modal-close" @click="gameToDelete = null">✕</button>
        </div>
        <div class="modal-body">
          <p class="confirm-text">
            Game <strong>"{{ gameToDelete.name || 'Game ' + formatDate(gameToDelete.createdAt) }}"</strong>
            akan dihapus permanen dari perangkat ini{{ gameToDelete.synced ? ' dan dari Firestore' : '' }}.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="gameToDelete = null">Batal</button>
          <button class="btn btn-danger" @click="confirmDelete">🗑️ Ya, Hapus</button>
        </div>
      </div>
    </div>

    <button
      v-if="games.length > 0"
      class="fab"
      aria-label="Buat Game Baru"
      @click="router.push({ name: 'config' })"
    >
      ➕
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStorage } from '../composables/useStorage.js'
import { usePwaInstall } from '../composables/usePwaInstall.js'

const router = useRouter()
const { getGames, deleteGame } = useStorage()

const { showInstallButton, install } = usePwaInstall()
const showIosHelp = ref(false)

function handleInstall() {
  // Chrome/Edge langsung prompt; iOS tidak punya prompt → tampilkan instruksi
  if (!install()) showIosHelp.value = true
}

const games = computed(() => getGames())

// Delete confirmation state
const gameToDelete = ref(null)

function openGame(id) {
  const game = getGames().find((g) => g.id === id)
  const view = game?.completed ? 'scoreboard' : 'rotation'
  router.push({ name: view, params: { gameId: id } })
}

function askDelete(game) {
  gameToDelete.value = game
}

function confirmDelete() {
  if (gameToDelete.value) {
    deleteGame(gameToDelete.value.id)
  }
  gameToDelete.value = null
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

.btn-install {
  margin-top: 16px;
  font-size: 14px;
  padding: 10px 20px;
}

.install-steps {
  margin: 0;
  padding-left: 20px;
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.9;
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

.badge-synced {
  background: var(--primary-bg);
  color: var(--primary);
}

.game-card-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.delete-btn {
  background: var(--tag-bg);
  border: none;
  font-size: 14px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s;
}

.delete-btn:hover {
  background: #fee2e2;
}

.delete-btn:active {
  opacity: 0.7;
}

/* Delete confirmation modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-container {
  background: var(--card-bg);
  width: 100%;
  max-width: 340px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 17px;
  margin: 0;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 20px;
}

.confirm-text {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.modal-footer {
  display: flex;
  gap: 8px;
  padding: 0 20px 20px;
}

.modal-footer .btn {
  flex: 1;
}

.btn-danger {
  background: var(--danger);
  color: #fff;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-primary);
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
