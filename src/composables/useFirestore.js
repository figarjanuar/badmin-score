import { doc, setDoc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore'
import { db, firebaseReady } from '../config/firebase.js'

const COLLECTION = 'games'

/**
 * Create or overwrite a game document in Firestore.
 * @param {object} game - full game object (id used as document ID)
 */
export async function pushGame(game) {
  if (!firebaseReady) return
  try {
    const ref = doc(db, COLLECTION, game.id)
    const plain = JSON.parse(JSON.stringify(game))
    await setDoc(ref, plain)
  } catch (err) {
    console.warn('Firestore pushGame failed:', err)
  }
}

/**
 * Fetch a game document from Firestore.
 * @param {string} gameId
 * @returns {object|null} parsed game or null if not found
 */
export async function pullGame(gameId) {
  if (!firebaseReady) return null
  try {
    const ref = doc(db, COLLECTION, gameId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return snap.data()
  } catch (err) {
    console.warn('Firestore pullGame failed:', err)
    return null
  }
}

/**
 * Subscribe to real-time updates for a game document.
 * Returns an unsubscribe function.
 * @param {string} gameId
 * @param {(game: object) => void} onUpdate
 * @returns {() => void} unsubscribe
 */
export function syncGame(gameId, onUpdate) {
  if (!firebaseReady) return () => {}
  const ref = doc(db, COLLECTION, gameId)
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data())
    }
  }, (err) => {
    console.warn('Firestore syncGame error:', err)
  })
}

/**
 * Partial update of a game document using setDoc merge.
 * @param {string} gameId
 * @param {object} updates - fields to merge
 */
export async function updateGameFirestore(gameId, updates) {
  if (!firebaseReady) return
  try {
    const ref = doc(db, COLLECTION, gameId)
    const plain = JSON.parse(JSON.stringify(updates))
    await setDoc(ref, plain, { merge: true })
  } catch (err) {
    console.warn('Firestore updateGameFirestore failed:', err)
  }
}

/**
 * Delete a game document from Firestore.
 * @param {string} gameId
 */
export async function deleteGameFirestore(gameId) {
  if (!firebaseReady) return
  try {
    const ref = doc(db, COLLECTION, gameId)
    await deleteDoc(ref)
  } catch (err) {
    console.warn('Firestore deleteGameFirestore failed:', err)
  }
}
