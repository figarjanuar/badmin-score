<template>
  <section class="page page-narrow match-unavailable">
    <PageHeading title="Match unavailable" :description="message" />
    <div class="link-actions">
      <button type="button" class="action-button primary" :disabled="loading" @click="retry">
        {{ loading ? 'Opening…' : 'Try again' }}
      </button>
      <RouterLink class="action-button" :to="{ name: 'dashboard' }">Back to home</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import PageHeading from '../components/PageHeading.vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const message = computed(() => ({
  local: 'This match is missing from this device and online access is unavailable.',
  offline: 'Check your internet connection and try again.',
  missing: 'Match not found. Ask the sender to check the link and sync status.',
  error: 'The sync service is unavailable. Check your connection and try again.',
})[route.query.reason] || 'Check the match link and try again.')

async function retry() {
  loading.value = true
  try {
    await router.replace({ name: 'rotation', params: { gameId: route.params.gameId } })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.link-actions { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
