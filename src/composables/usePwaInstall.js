import { ref, computed, onMounted, onUnmounted } from 'vue'

// Mengelola tombol "Pasang Aplikasi" PWA di Dashboard.
// - Chrome/Edge/Android: menunggu event beforeinstallprompt, lalu install()
//   memanggil prompt() milik browser (mengembalikan true).
// - iOS Safari: tidak ada beforeinstallprompt — install() mengembalikan false,
//   view menampilkan instruksi manual (Share → Add to Home Screen).
export function usePwaInstall() {
  const canPrompt = ref(false)
  const isIos = ref(false)
  const isInstalled = ref(false)

  let deferredPrompt = null

  const showInstallButton = computed(
    () => !isInstalled.value && (canPrompt.value || isIos.value)
  )

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true // iOS
    )
  }

  function onBeforeInstallPrompt(e) {
    e.preventDefault()
    deferredPrompt = e
    canPrompt.value = true
  }

  function onAppInstalled() {
    isInstalled.value = true
    canPrompt.value = false
    deferredPrompt = null
  }

  function onDisplayModeChange() {
    if (isStandalone()) onAppInstalled()
  }

  function install() {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    deferredPrompt.userChoice.finally(() => {
      deferredPrompt = null
      canPrompt.value = false
    })
    return true
  }

  onMounted(() => {
    if (isStandalone()) return
    isIos.value = /iphone|ipad|ipod/i.test(navigator.userAgent)
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    window
      .matchMedia('(display-mode: standalone)')
      .addEventListener('change', onDisplayModeChange)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onAppInstalled)
    window
      .matchMedia('(display-mode: standalone)')
      .removeEventListener('change', onDisplayModeChange)
  })

  return { showInstallButton, install }
}
