<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container share-modal">
      <div class="modal-header">
        <h2 class="modal-title">🔗 Bagikan Pertandingan</h2>
        <button class="modal-close" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body share-body">
        <p class="share-hint">Scan QR code atau copy link di bawah untuk membuka pertandingan ini di HP lain:</p>

        <!-- QR Code -->
        <div class="qr-wrapper">
          <canvas ref="qrCanvas" class="qr-canvas"></canvas>
        </div>

        <!-- Share URL -->
        <div class="share-url-row">
          <input
            ref="urlInput"
            class="share-url-input"
            :value="url"
            readonly
            @click="$refs.urlInput.select()"
          />
          <button class="btn btn-primary btn-copy" @click="copyLink">
            {{ copied ? '✅ Tersalin' : '📋 Copy' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watchEffect } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  url: { type: String, required: true },
})
defineEmits(['close'])

const qrCanvas = ref(null)
const urlInput = ref(null)
const copied = ref(false)

onMounted(() => {
  if (qrCanvas.value && props.url) {
    QRCode.toCanvas(qrCanvas.value, props.url, {
      width: 220,
      margin: 2,
      color: {
        dark: '#1f2937',
        light: '#ffffff',
      },
    })
  }
})

watchEffect(() => {
  if (qrCanvas.value && props.url) {
    QRCode.toCanvas(qrCanvas.value, props.url, {
      width: 220,
      margin: 2,
      color: {
        dark: '#1f2937',
        light: '#ffffff',
      },
    })
  }
})

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Fallback: select and let user copy manually
    if (urlInput.value) {
      urlInput.value.select()
    }
  }
}
</script>

<style scoped>
.share-modal {
  max-width: 360px;
}

.share-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.share-hint {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  margin: 0;
  line-height: 1.5;
}

.qr-wrapper {
  padding: 12px;
  background: #fff;
  border-radius: 12px;
  border: 2px solid var(--border);
}

.qr-canvas {
  display: block;
}

.share-url-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.share-url-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--input-bg);
  word-break: break-all;
}

.btn-copy {
  white-space: nowrap;
  padding: 10px 14px;
  font-size: 13px;
}

/* Reuse modal styles from RotationView */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-container {
  background: var(--card-bg);
  width: 100%;
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

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
}
.btn:active { opacity: 0.8; }
.btn-primary { background: var(--primary); color: #fff; }
</style>
