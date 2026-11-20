import { doc, setDoc, updateDoc, getDocFromServer, onSnapshot, deleteDoc, runTransaction } from 'firebase/firestore'
import { db, firebaseReady } from '../config/firebase.js'

const COLLECTION = 'games'

export async function pushGame(game) {
  if (!firebaseReady) return
  const { synced, ...data } = game
  await setDoc(doc(db, COLLECTION, game.id), JSON.parse(JSON.stringify(data)))
}

export async function pullGame(gameId) {
  if (!firebaseReady) return null
  const snap = await getDocFromServer(doc(db, COLLECTION, gameId))
  return snap.exists() ? snap.data() : null
}

export async function publishGame(game) {
  if (!firebaseReady) return
  const { synced, ...data } = game
  const snapshot = JSON.parse(JSON.stringify(data))
  const ref = doc(db, COLLECTION, game.id)
  await runTransaction(db, async (transaction) => {
    if (!(await transaction.get(ref)).exists()) transaction.set(ref, snapshot)
  })
}

export function syncGame(gameId, onUpdate) {
  if (!firebaseReady) return () => {}
  return onSnapshot(doc(db, COLLECTION, gameId), { includeMetadataChanges: true }, (snap) => {
    if (snap.exists() && !snap.metadata.hasPendingWrites && !snap.metadata.fromCache) {
      onUpdate(snap.data())
    }
  }, (err) => {
    console.warn('Firestore syncGame error:', err)
  })
}

export async function updateGameFirestore(gameId, updates) {
  if (!firebaseReady) return
  const data = JSON.parse(JSON.stringify(updates))
  await updateDoc(doc(db, COLLECTION, gameId), data)
}

export async function deleteGameFirestore(gameId) {
  if (!firebaseReady) return
  await deleteDoc(doc(db, COLLECTION, gameId))
}
