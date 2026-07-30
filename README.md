# 🏸 BadminScore

**Aplikasi manajemen sesi badminton** — atur jadwal main, rotasi pemain, dan skor dengan adil dan otomatis.

Dibangun dengan **Vue 3 + Vite**, 100% client-side (data disimpan di localStorage). Cocok dipakai buat latihan rutin, pertandingan komunitas, atau event badminton internal.

---

## ✨ Fitur

| Fitur | Deskripsi |
|-------|-----------|
| 📊 **Dashboard** | Lihat semua sesi game, status (berjalan/selesai), akses cepat |
| ⚙️ **Konfigurasi Game** | Atur nama event, jumlah lapangan, daftar pemain |
| 🔄 **Rotasi Otomatis** | Algoritma pembagian pasangan adil — minim pengulangan partner, distribusi main merata |
| 📋 **Per Ronde** | Navigasi antar ronde, lihat pasangan & pemain istirahat |
| ✏️ **Input Skor** | Edit skor tiap pertandingan per ronde |
| 🏆 **Scoreboard & Klasemen** | Win rate, jumlah main, riwayat pertandingan per pemain |
| 💾 **Tersimpan Lokal** | Data game tetap tersimpan di browser (localStorage) |

### 🧠 Cara Kerja Rotasi

1. Masukkan jumlah lapangan dan daftar pemain
2. Klik **Generate Jadwal** — algoritma menghitung ronde optimal (target ~4 game per pemain)
3. Tiap ronde, pemain dengan jumlah main paling sedikit diprioritaskan
4. Pasangan dipilih untuk **meminimalkan pengulangan partner** sepanjang sesi
5. Review ronde, input skor, selesai!

---

## 🚀 Demo / Live

> Aplikasi ini di-deploy di GitHub Pages:  
> **[https://figar.github.io/badmin-score](https://figar.github.io/badmin-score)**

---

## 🛠️ Tech Stack

- **Framework** — [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`, SFC)
- **Build Tool** — [Vite](https://vite.dev/)
- **Plugin** — [@vitejs/plugin-vue](https://github.com/vitejs/vite-plugin-vue)
- **Penyimpanan** — `localStorage` via composable `useStorage`
- **Deploy** — GitHub Pages (`gh-pages` branch / `dist/` folder)

---

## 📦 Instalasi & Pengembangan

```bash
# Clone repo
git clone https://github.com/figar/badmin-score.git
cd badmin-score

# Install dependencies
npm install

# Jalankan dev server
npm run dev

# Build untuk production
npm run build

# Preview hasil build
npm run preview
```

### Struktur Project

```
badmin-score/
├── index.html               # Entry HTML
├── vite.config.js            # Konfigurasi Vite
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── main.js               # Entry Vue app
│   ├── App.vue                # Root component + routing sederhana
│   ├── style.css              # Global styles & CSS variables
│   ├── components/
│   │   └── EditScoreModal.vue  # Modal input skor
│   ├── composables/
│   │   ├── useRotation.js      # Algoritma generate jadwal rotasi
│   │   └── useStorage.js       # Wrapper localStorage (reaktif)
│   └── views/
│       ├── DashboardView.vue   # Halaman utama
│       ├── ConfigView.vue      # Konfigurasi game & pemain
│       ├── RotationView.vue    # Lihat ronde + edit skor
│       └── ScoreboardView.vue  # Klasemen & hasil pertandingan
└── dist/                      # Hasil build siap deploy
```

---

## ⚙️ Konfigurasi

### CSS Variables

Global styling diatur via CSS custom properties di `src/style.css`:

```css
--primary: #2563eb;        /* Warna utama (biru) */
--primary-bg: #dbeafe;     /* Background warna utama */
--bg: #f0f2f5;             /* Background halaman */
--card-bg: #ffffff;        /* Background card */
--text-primary: #1f2937;   /* Warna teks utama */
--text-secondary: #6b7280; /* Warna teks sekunder */
--danger: #ef4444;         /* Warna error/danger */
--green: #16a34a;          /* Warna sukses/hijau */
--yellow: #d97706;         /* Warna peringatan/kuning */
```

### Vite Config

- **base**: `'/badmin-score/'` (disesuaikan untuk GitHub Pages)
- **Plugin**: Vue SFC compiler

---

## 📄 Lisensi

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 🙌 Kontribusi

Pull request dipersilakan! Untuk perubahan besar, buka issue dulu untuk diskusi.

---

*Dibuat dengan ❤️ untuk komunitas badminton*
