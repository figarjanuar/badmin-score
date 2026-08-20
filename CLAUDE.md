# BadminScore — Project Guide

Aplikasi **tracker skor badminton** untuk sesi main bersama: generate rotasi/pembagian pemain yang adil, tracking skor tiap lapangan, dan share match ke perangkat lain (real-time sync).

## Tech Stack

- **Vue 3** (Composition API, `<script setup>`, SFC) + **Vite** — pure JavaScript, TANPA TypeScript
- **Tanpa UI framework** — semua styling pure CSS dengan CSS custom properties di `src/style.css`
- **Tanpa vue-router** — view switching manual via `currentView` ref di `App.vue`; deep link pakai hash (`#/match/<gameId>`)
- **Tanpa Pinia/Vuex** — state pakai singleton reactive di `useStorage.js`
- **Firebase Firestore** (opsional) — real-time sync antar device. **localStorage tetap primary store**; Firestore adalah sync layer
- **qrcode** — QR code untuk share match
- Deploy: **GitHub Pages** via GitHub Actions (`.github/workflows/deploy.yml`), base path `/badmin-score/`

## Menjalankan

```bash
npm install          # install deps
cp .env.example .env # lalu isi kredensial Firebase (bisa dummy — app tetap jalan tanpa Firebase)
npm run dev          # dev server
npm run build        # production build
```

Firebase env vars dibaca dari `.env` (gitignored). Saat CI deploy, workflow inject sebagai GitHub Actions secrets. Kalau Firebase tidak terkonfigurasi, `src/config/firebase.js` mengekspor `db = null` dan app berjalan normal (localStorage only) — jangan pernah buat kode yang asumsi Firebase selalu ada.

## Struktur File

```
src/
  main.js                       — bootstrap
  App.vue                       — root shell + manual routing + hash routing
  style.css                     — CSS variables + global styles
  config/
    firebase.js                 — inisialisasi Firebase (graceful kalau ga dikonfigurasi)
  composables/
    useStorage.js               — singleton reactive localStorage + facade ke Firestore
    useFirestore.js             — CRUD + onSnapshot Firestore (pushGame, pullGame, syncGame, ...)
    useRotation.js              — generateSession(numCourts, players): algoritma rotasi
  components/
    EditScoreModal.vue          — modal edit skor manual (fallback)
    ShareModal.vue              — modal share: QR code + copy link
  views/
    DashboardView.vue           — daftar game + hapus game
    ConfigView.vue              — setup game (nama, lapangan, pemain, generate jadwal)
    RotationView.vue            — tampilan live match: scoreboard +/- per lapangan
    ScoreboardView.vue          — klasemen + riwayat match (read-only)
  public/
    manifest.webmanifest        — PWA manifest (display: standalone) — wajib untuk installable
    sw.js                       — service worker: cache shell + offline (didaftarkan di main.js, production only)
    icon-192.png, icon-512.png  — ikon PWA (generate dari favicon.svg)
```

## Data Model

```js
game = {
  id: String,                    // Date.now().toString(36) + random 4 chars
  name: String,                  // nama event
  createdAt: String,             // ISO date
  numCourts: Number,             // 1-6
  completed: Boolean,
  synced: Boolean,               // sudah di-push ke Firestore (hanya lokal)
  players: [{ id: Number, name: String }],
  rounds: [{
    num: Number,
    resting: [id, ...],
    courts: [{
      court: Number,             // 1-based
      pair1: [id, id],           // home pair
      pair2: [id, id],           // away pair
      score1: Number | null,     // null = belum ada skor
      score2: Number | null,
    }]
  }]
}
```

Penyimpanan: localStorage key `badminscore` → `{ games: [...] }`. Firestore: collection `games`, document ID = game id, shape sama persis (tanpa transformasi).

## Pola Penting (WAJIB diikuti)

1. **`useStorage()` adalah satu-satunya pintu data** — semua komponen akses game lewat `getGames()`/`getGame(id)` (reactive, `computed`). Jangan pernah bypass ke localStorage/Firestore langsung dari view.
2. **Optimistic updates**: mutasi state lokal → `persist()` → fire-and-forget ke Firestore (`.catch` → `console.warn`). Jangan pernah `await` Firestore di UI.
3. **`useFirestore.js` semua fungsi guard `if (!firebaseReady) return`** — tambahkan guard yang sama untuk fungsi baru.
4. **Routing**: `App.vue` memegang `currentView` ('dashboard' | 'config' | 'rotation' | 'scoreboard'), `viewStack`, `activeGameId`. View berkomunikasi lewat `emit('navigate', view, gameId)` dan `emit('back')`.
5. **Hash routing**: `#/match/<gameId>` diparse di `App.vue.handleHashChange()` → `loadRemoteGame()` → navigate + `subscribeToGame()`. Subscription disimpan di `activeUnsubscribe` dan di-cleanup saat pindah view. Jangan buat subscription duplikat.
6. **Menambah skor**: `adjustScore(courtNum, side, delta)` di RotationView — deep-clone `rounds`, update, `updateGame(id, { rounds })`. Skor min 0, `null` diperlakukan sebagai 0. `updateGame` dengan `{ rounds }` harus dikirim utuh (bukan partial nested).
7. **Rotation algorithm** (`useRotation.js`): `targetGames = 4` (bisa diubah), pemilihan pemain per ronde: shuffle + sort by game count (least first). `bestPairing` meminimalkan pengulangan *partner* (belum mempertimbangkan *lawan* — lihat catatan). Dengan 4 games, secara matematis setiap pemain ga bisa ketemu semua 13 pemain lain (batas 12 pertemuan).
8. **Modal pattern**: overlay fixed + container, `@click.self` untuk close, header dengan tombol ✕, footer dengan tombol aksi. Copy dari RotationView/DashboardView.
9. **Bahasa UI**: Indonesia. Emoji untuk ikon (tidak ada icon library).
10. **CSS**: variabel global di `style.css` (`--primary`, `--border`, `--green`, dll). Style scoped per komponen, jangan import CSS global di luar `App.vue`.

## Alur Utama

1. **Buat game**: Dashboard → ConfigView → `generateSession(numCourts, players)` → `addGame(game)` → navigate ke RotationView
2. **Scoring**: RotationView → tombol +/− di scoreboard, klik angka untuk edit inline, atau ✏️ → EditScoreModal
3. **Share**: tombol "🔗 Bagikan" → set hash URL + `pushGame()` → ShareModal (QR + copy link)
4. **Akses via link**: `#/match/<id>` → `loadRemoteGame` (cache localStorage dulu, baru Firestore) → subscribe real-time
5. **Selesai**: "✅ Selesai" → `completed: true` → ScoreboardView (klasemen + riwayat)
6. **Hapus**: Dashboard → 🗑️ → konfirmasi → `deleteGame` (localStorage + Firestore)

## Deploy

Push ke `main` → GitHub Actions build → GitHub Pages. Build membutuhkan 6 secrets: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.

## Catatan & Perbaikan yang Diketahui

- Algoritma rotasi hanya optimasi pengulangan partner, **bukan lawan** — pemain bisa sering bertemu lawan yang sama. Upgrade potensial: tambah `opponentCounts` di `bestPairing`.
- Tidak ada offline queue: kalau offline, write Firestore gagal silent (localStorage tetap jalan).
- Tidak ada auth — match ID adalah "capability URL" (siapa pun dengan link bisa edit).
- Firestore `setDoc` merge dipakai untuk update — array `rounds` dikirim utuh, bukan dot-notation.
