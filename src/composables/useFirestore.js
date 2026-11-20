import {
  collection, deleteDoc, doc, getDocFromServer, getDocsFromServer,
  limit, onSnapshot, orderBy, query, runTransaction, setDoc, startAfter, updateDoc,
} from 'firebase/firestore'
import { db, firebaseReady } from '../config/firebase.js'

const COLLECTION = 'games'
const ADMIN_PAGE_SIZE = 10

export async function listGamesPage(after) {
  if (!firebaseReady) return { games: [], nextCursor: null }

  const constraints = [orderBy('createdAt', 'desc'), limit(ADMIN_PAGE_SIZE + 1)]
  if (after) constraints.push(startAfter(after))
  const snapshot = await getDocsFromServer(query(collection(db, COLLECTION), ...constraints))
  const page = snapshot.docs.slice(0, ADMIN_PAGE_SIZE)
  return {
    games: page.map((item) => ({ ...item.data(), id: item.id })),
    nextCursor: snapshot.size > ADMIN_PAGE_SIZE ? page.at(-1) : null,
  }
}

export async function pushGame(game) {
  if (!firebaseReady) return
  const { synced, ...data } = game
  await setDoc(doc(db, COLLECTION, game.id), JSON.parse(JSON.stringify(data)))
}

export async function pullGame(gameId) {
  if (!firebaseReady) return null
  const snap = await getDocFromServer(doc(db, COLLECTION, gameId))
  return snap.exists() ? { ...snap.data(), id: snap.id } : null
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
      onUpdate({ ...snap.data(), id: snap.id })
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
