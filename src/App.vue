<template>
  <div class="app-shell">
    <header class="app-header">
      <button
        v-if="route.name && route.name !== 'dashboard'"
        class="back-btn"
        aria-label="Kembali"
        @click="goBack"
      >
        ←
      </button>
      <span class="app-title">{{ headerTitle }}</span>
      <span class="header-spacer"></span>
    </header>

    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <component :is="Component" :key="route.params.gameId" />
      </RouterView>
    </main>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAppBack } from './composables/useAppBack.js'
import { useStorage } from './composables/useStorage.js'

const { getGame, subscribeToGame } = useStorage()
const route = useRoute()
const goBack = useAppBack()

const headerTitle = computed(() => {
  switch (route.name) {
    case 'config': return 'Konfigurasi'
    case 'rotation': return getGame(route.params.gameId)?.mode === 'club' ? 'Club vs Club' : 'Rotasi'
    case 'scoreboard': return 'Scoreboard'
    default: return 'BadminScore'
  }
})

watch(() => route.params.gameId, (gameId, _previousId, onCleanup) => {
  if (gameId) onCleanup(subscribeToGame(gameId))
}, { immediate: true })
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
