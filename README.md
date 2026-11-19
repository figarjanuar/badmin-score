# 🏸 BadminScore

**Badminton session management app** — organize game schedules, player rotation, and scores fairly and automatically.

Built with **Vue 3 + Vite**, 100% client-side (data stored in localStorage). Great for regular practice sessions, community tournaments, or internal badminton events.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Dashboard** | View all game sessions, status (active/completed), quick access |
| ⚙️ **Game Configuration** | Set event name, number of courts, player list |
| 🔄 **Auto Rotation** | Fair pair distribution algorithm — minimize partner repetition, even play distribution |
| 📋 **Per Round** | Navigate between rounds, view pairings |
| ✏️ **Score Input** | Edit scores directly and add sets for the same match |
| 🏆 **Scoreboard & Standings** | Win rate, games played, match history per player |
| 💾 **Local Storage** | Game data persists in browser (localStorage) |

### 🧠 How Rotation Works

1. Enter the number of courts and player list
2. Click **Generate Schedule** — algorithm calculates optimal rounds (target ~4 games per player)
3. Each round, players with the fewest games played are prioritized
4. Pairs are chosen to **minimize partner repetition** throughout the session
5. Review rounds, input scores, done!

---

## 🚀 Demo / Live

> This app is deployed on GitHub Pages:  
> **[https://figarjanuar.github.io/badmin-score](https://figarjanuar.github.io/badmin-score)**

---

## 🛠️ Tech Stack

- **Framework** — [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`, SFC)
- **Build Tool** — [Vite](https://vite.dev/)
- **Plugin** — [@vitejs/plugin-vue](https://github.com/vitejs/vite-plugin-vue)
- **Storage** — `localStorage` via `useStorage` composable
- **Deploy** — GitHub Pages (`gh-pages` branch / `dist/` folder)

---

## 📦 Installation & Development

```bash
# Clone repo
git clone https://github.com/figarjanuar/badmin-score.git
cd badmin-score

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview build result
npm run preview
```

### Project Structure

```
badmin-score/
├── index.html               # Entry HTML
├── vite.config.js            # Vite configuration
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── main.js               # Vue app entry point
│   ├── App.vue                # Root component + simple routing
│   ├── style.css              # Global styles & CSS variables
│   ├── components/
│   │   └── MatchSetScores.vue  # Set scores in match history
│   ├── composables/
│   │   ├── useRotation.js      # Rotation schedule generation algorithm
│   │   └── useStorage.js       # Reactive localStorage wrapper
│   └── views/
│       ├── DashboardView.vue   # Home page
│       ├── ConfigView.vue      # Game & player configuration
│       ├── RotationView.vue    # Round view + score editing
│       └── ScoreboardView.vue  # Standings & match results
└── dist/                      # Build output ready for deploy
```

---

## ⚙️ Configuration

### CSS Variables

Global styling is managed via CSS custom properties in `src/style.css`:

```css
--primary: #2563eb;        /* Primary color (blue) */
--primary-bg: #dbeafe;     /* Primary background */
--bg: #f0f2f5;             /* Page background */
--card-bg: #ffffff;        /* Card background */
--text-primary: #1f2937;   /* Primary text color */
--text-secondary: #6b7280; /* Secondary text color */
--danger: #ef4444;         /* Error/danger color */
--green: #16a34a;          /* Success/green color */
--yellow: #d97706;         /* Warning/yellow color */
```

### Vite Config

- **base**: `'/badmin-score/'` (configured for GitHub Pages)
- **Plugin**: Vue SFC compiler

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 🙌 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

*Made with ❤️ for the badminton community*
