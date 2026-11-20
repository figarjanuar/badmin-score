import { createRouter, createWebHashHistory } from 'vue-router'
import { useStorage } from './composables/useStorage.js'
import DashboardView from './views/DashboardView.vue'
import ConfigView from './views/ConfigView.vue'
import RotationView from './views/RotationView.vue'
import { firebaseReady } from './config/firebase.js'
import MatchUnavailableView from './views/MatchUnavailableView.vue'
import ScoreboardView from './views/ScoreboardView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/config', name: 'config', component: ConfigView },
    { path: '/admin/login', name: 'admin-login', component: () => import('./views/AdminLoginView.vue') },
    { path: '/admin', name: 'admin', component: () => import('./views/AdminDashboardView.vue') },
    { path: '/match/:gameId', name: 'rotation', component: RotationView, props: true },
    { path: '/match/:gameId/scoreboard', name: 'scoreboard', component: ScoreboardView, props: true },
    { path: '/match/:gameId/unavailable', name: 'match-unavailable', component: MatchUnavailableView },
    { path: '/:pathMatch(.*)*', redirect: { name: 'dashboard' } },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition || { top: 0 }
  },
})

const { loadRemoteGame } = useStorage()

router.beforeEach(async (to) => {
  if (to.name === 'admin' || to.name === 'admin-login') {
    const { hasAdminSession } = await import('./composables/adminAuth.js')
    const isAdmin = await hasAdminSession().catch(() => false)
    if (to.name === 'admin' && !isAdmin) return { name: 'admin-login', replace: true }
    if (to.name === 'admin-login' && isAdmin) return { name: 'admin', replace: true }
    return
  }

  if (!to.params.gameId || to.name === 'match-unavailable') return

  const unavailable = (reason) => ({
    name: 'match-unavailable',
    params: to.params,
    query: { reason },
    replace: true,
  })
  let game
  try {
    game = await loadRemoteGame(to.params.gameId)
  } catch {
    return unavailable(navigator.onLine ? 'error' : 'offline')
  }
  if (!game) return unavailable(firebaseReady ? 'missing' : 'local')

  const name = game.completed ? 'scoreboard' : 'rotation'
  if (to.name !== name) return { name, params: to.params }
})

export default router
