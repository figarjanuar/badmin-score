<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="header-inner">
        <button
          v-if="route.name && route.name !== 'dashboard'"
          class="action-button ghost icon back-btn"
          aria-label="Back"
          @click="goBack"
        >
          <AppIcon name="back" />
        </button>
        <RouterLink class="brand" :to="{ name: 'dashboard' }" aria-label="BadminScore home">
          <img class="brand-mark" :src="brandIcon" width="33" height="33" alt="" />
          <span>Badmin<span class="brand-accent">Score</span></span>
        </RouterLink>
        <span v-if="headerTitle" class="header-location">{{ headerTitle }}</span>
      </div>
    </header>

    <main ref="main" class="app-main" tabindex="-1">
      <RouterView v-slot="{ Component }">
        <component :is="Component" :key="route.params.gameId" />
      </RouterView>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AppIcon from './components/AppIcon.vue'
import { useAppBack } from './composables/useAppBack.js'
import { useStorage } from './composables/useStorage.js'

const { getGame, subscribeToGame } = useStorage()
const route = useRoute()
const router = useRouter()
const main = ref(null)
const goBack = useAppBack()
const brandIcon = import.meta.env.BASE_URL + 'favicon.svg?v=2'

const headerTitle = computed(() => {
  switch (route.name) {
    case 'config': return 'Setup'
    case 'rotation': return getGame(route.params.gameId)?.mode === 'club' ? 'Club vs Club' : 'Rotation'
    case 'scoreboard': return 'Session results'
    default: return ''
  }
})

const activeGameId = computed(() => route.name !== 'match-unavailable' ? route.params.gameId : undefined)

watch(activeGameId, (gameId, _previousId, onCleanup) => {
  if (!gameId) return
  onCleanup(subscribeToGame(gameId, (game) => {
    const name = game.completed ? 'scoreboard' : 'rotation'
    if (route.name !== name) router.replace({ name, params: { gameId } })
  }))
}, { immediate: true })

watch(() => route.path, () => main.value?.focus({ preventScroll: true }), { flush: 'post' })
</script>

<style scoped>
.app-shell { min-height: 100dvh; }

.app-header {
  position: sticky;
  z-index: 10;
  top: 0;
  padding-top: env(safe-area-inset-top);
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 62px;
  width: min(100%, var(--page-width));
  margin-inline: auto;
  padding-inline: var(--page-gutter);
}

.back-btn { margin-inline-start: -8px; }

.brand {
  display: inline-flex;
  min-height: var(--size-control);
  align-items: center;
  gap: 9px;
  font-size: 18px;
  font-weight: 850;
  letter-spacing: -0.035em;
  text-decoration: none;
  white-space: nowrap;
}

.brand-mark {
  flex-shrink: 0;
}

.brand-accent { color: var(--primary); }
.header-location {
  padding-inline-start: 12px;
  border-inline-start: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 14px;
}

.app-main:focus { outline: none; }

@media (max-width: 500px) {
  .header-location { display: none; }
  .header-inner { min-height: 56px; gap: 6px; }
}
</style>
