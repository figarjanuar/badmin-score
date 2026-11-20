import '@fontsource-variable/dm-sans'
import '@fontsource/barlow-condensed/latin-700.css'
import './style.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'

createApp(App).use(router).mount('#app')

// Service worker untuk PWA (installable dari browser + offline).
// Hanya didaftarkan di production — di dev bisa mengganggu HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((err) => console.warn('Service worker gagal didaftarkan:', err))
  })
}
