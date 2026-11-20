<template>
  <section class="page admin-login">
    <form class="surface login-form" @submit.prevent="submit">
      <h1 class="page-title">Admin login</h1>
      <label>
        Username
        <input v-model="username" class="input" autocomplete="username" autocapitalize="none" required />
      </label>
      <label>
        Password
        <input v-model="password" class="input" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="!adminAuthReady || error" class="login-error" role="alert">
        {{ adminAuthReady ? error : 'Firebase is unavailable.' }}
      </p>
      <button class="action-button primary" type="submit" :disabled="busy || !adminAuthReady">
        {{ busy ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminAuthReady, signInAdmin } from '../composables/adminAuth.js'

const router = useRouter()
const username = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

async function submit() {
  if (busy.value || !adminAuthReady) return
  busy.value = true
  error.value = ''
  const invalidLogin = 'Invalid username or password.'

  try {
    if (await signInAdmin(username.value, password.value)) {
      await router.replace({ name: 'admin' })
    } else {
      error.value = invalidLogin
    }
  } catch (err) {
    switch (err.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/user-disabled':
        error.value = invalidLogin
        break
      case 'auth/too-many-requests':
        error.value = 'Too many attempts. Try again later.'
        break
      default:
        error.value = 'Could not sign in. Try again.'
    }
  } finally {
    password.value = ''
    busy.value = false
  }
}
</script>

<style scoped>
.admin-login { max-width: 30rem; }

.login-form {
  display: grid;
  gap: 18px;
  padding: clamp(20px, 5vw, 32px);
}

.login-form label {
  display: grid;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
}

.login-error { color: var(--danger); }
</style>
