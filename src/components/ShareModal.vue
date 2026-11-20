<template>
  <AppDialog title="Share match" @close="$emit('close')">
    <div class="share-body">
      <p v-if="status !== 'ready'" role="status">{{ hint }}</p>
      <button v-if="status === 'error' || (status === 'local' && firebaseReady)" type="button"
        class="action-button" @click="$emit('retry')">Retry sync</button>

      <template v-if="status === 'ready'">
        <p>Scan the QR code or copy the link to open this match on another device. Anyone with the link can edit an active session.</p>
        <canvas ref="qrCanvas" v-show="!qrError" aria-hidden="true"></canvas>
        <div class="share-url-row">
          <input class="input" ref="urlInput" aria-label="Match link" :value="url" readonly @click="urlInput.select()" />
          <button type="button" class="action-button primary" @click="copyLink">Copy link</button>
        </div>
        <p v-if="copyMessage" class="copy-message" role="status">{{ copyMessage }}</p>
      </template>
    </div>
  </AppDialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import QRCode from 'qrcode'
import AppDialog from './AppDialog.vue'
import { firebaseReady } from '../config/firebase.js'

const props = defineProps({
  url: { type: String, required: true },
  status: { type: String, required: true },
})
defineEmits(['close', 'retry'])

const qrCanvas = ref(null)
const urlInput = ref(null)
const qrError = ref(false)
const copyMessage = ref('')
const hint = computed(() => ({
  local: firebaseReady
    ? 'Saved on this device. Connect to the internet to share this session.'
    : 'Saved on this device. Sharing is unavailable.',
  pending: 'Syncing the match. The link will appear once it’s saved online.',
  error: 'Sync failed. The match is still saved on this device.',
})[props.status])

watch([qrCanvas, () => props.url], ([canvas, url]) => {
  if (!canvas) return
  qrError.value = false
  QRCode.toCanvas(canvas, url, { width: 184, margin: 4 }).catch(() => { qrError.value = true })
}, { flush: 'post' })

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.url)
    copyMessage.value = 'Link copied.'
  } catch {
    urlInput.value.focus()
    urlInput.value.select()
    copyMessage.value = 'Link selected. Copy it using your device menu or keyboard.'
  }
}
</script>

<style scoped>
.share-body {
  display: grid;
  justify-items: center;
  gap: 16px;
  color: var(--text-secondary);
}

.share-url-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.share-url-row button { flex-shrink: 0; }
.share-body canvas { border-radius: var(--radius-control); }
.copy-message { font-size: 14px; }
</style>
