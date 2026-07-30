<template>
  <div class="app-shell">
    <header class="app-header">
      <button
        v-if="currentView !== 'dashboard'"
        class="back-btn"
        @click="goBack"
      >
        ←
      </button>
      <span class="app-title">{{ headerTitle }}</span>
      <span class="header-spacer"></span>
    </header>

    <main class="app-main">
      <DashboardView
        v-if="currentView === 'dashboard'"
        @navigate="handleNavigate"
      />
      <ConfigView
        v-else-if="currentView === 'config'"
        @navigate="handleNavigate"
      />
      <RotationView
        v-else-if="currentView === 'rotation'"
        :game-id="activeGameId"
        @navigate="handleNavigate"
      />
      <ScoreboardView
        v-else-if="currentView === 'scoreboard'"
        :game-id="activeGameId"
        @navigate="handleNavigate"
        @back="goBack"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import DashboardView from './views/DashboardView.vue'
import ConfigView from './views/ConfigView.vue'
import RotationView from './views/RotationView.vue'
import ScoreboardView from './views/ScoreboardView.vue'

const currentView = ref('dashboard')
const activeGameId = ref(null)

const headerTitle = computed(() => {
  switch (currentView.value) {
    case 'dashboard': return 'BadminScore'
    case 'config': return 'Konfigurasi'
    case 'rotation': return 'Rotasi'
    case 'scoreboard': return 'Scoreboard'
    default: return 'BadminScore'
  }
})

const viewStack = ref(['dashboard'])

function handleNavigate(view, gameId) {
  if (view === 'dashboard') {
    viewStack.value = ['dashboard']
    currentView.value = 'dashboard'
    activeGameId.value = null
  } else {
    viewStack.value.push(currentView.value)
    currentView.value = view
    if (gameId) {
      activeGameId.value = gameId
    }
  }
}

function goBack() {
  if (viewStack.value.length > 0) {
    currentView.value = viewStack.value.pop()
  } else {
    currentView.value = 'dashboard'
  }
}
</script>

<style>
/* Import global styles */
@import './style.css';
</style>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--bg);
}

.app-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--primary);
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
  min-height: 48px;
}

.back-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  padding: 4px 8px 4px 0;
  width: 40px;
}

.app-title {
  font-size: 18px;
  font-weight: 700;
}

.header-spacer {
  flex: 1;
}

.app-main {
  flex: 1;
}
</style>
