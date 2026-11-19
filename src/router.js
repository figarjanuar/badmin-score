import { createRouter, createWebHashHistory } from 'vue-router'
import { useStorage } from './composables/useStorage.js'
import DashboardView from './views/DashboardView.vue'
import ConfigView from './views/ConfigView.vue'
import RotationView from './views/RotationView.vue'
import ScoreboardView from './views/ScoreboardView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/config', name: 'config', component: ConfigView },
    { path: '/match/:gameId', name: 'rotation', component: RotationView, props: true },
    { path: '/match/:gameId/scoreboard', name: 'scoreboard', component: ScoreboardView, props: true },
    { path: '/:pathMatch(.*)*', redirect: { name: 'dashboard' } },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition || { top: 0 }
  },
})

const { loadRemoteGame } = useStorage()

router.beforeEach(async (to) => {
  if (!to.params.gameId) return

  const game = await loadRemoteGame(to.params.gameId)
  if (!game) return { name: 'dashboard', replace: true }

  const name = game.completed ? 'scoreboard' : 'rotation'
  if (to.name !== name) return { name, params: to.params }
})

export default router
