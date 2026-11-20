import { browserSessionPersistence, initializeAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { app } from '../config/firebase.js'

const auth = app ? initializeAuth(app, { persistence: browserSessionPersistence }) : null

export const adminAuthReady = !!auth

export async function hasAdminSession() {
  if (!auth) return false
  await auth.authStateReady()
  const token = await auth.currentUser?.getIdTokenResult()
  return token?.claims.badminAdmin === true
}

export async function signInAdmin(username, password) {
  if (username.trim().toLowerCase() !== 'figar') return false
  await signInWithEmailAndPassword(auth, 'figar@badmin-score.example', password)
  if (await hasAdminSession()) return true
  await signOut(auth)
  return false
}

export function signOutAdmin() {
  return signOut(auth)
}
