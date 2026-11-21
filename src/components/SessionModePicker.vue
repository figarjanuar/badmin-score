<template>
  <fieldset class="mode-picker">
    <legend class="field-label">Game mode</legend>
    <div class="mode-groups">
      <section v-for="group in groups" :key="group.id" class="mode-group">
        <h2 class="group-heading">
          <button
            :id="'mode-heading-' + group.id"
            type="button"
            class="group-toggle"
            :aria-expanded="expandedGroup === group.id"
            :aria-controls="'mode-panel-' + group.id"
            @click="expandedGroup = expandedGroup === group.id ? null : group.id"
          >
            <span class="group-icon"><AppIcon :name="group.icon" /></span>
            <span class="group-title">{{ group.title }}</span>
            <span v-if="expandedGroup !== group.id && selectedGroup === group" class="group-selection">
              {{ selectedMode.title }}
            </span>
            <AppIcon :name="expandedGroup === group.id ? 'chevron-up' : 'chevron-down'" />
          </button>
        </h2>
        <ul v-show="expandedGroup === group.id" :id="'mode-panel-' + group.id" class="mode-list"
          :aria-labelledby="'mode-heading-' + group.id">
          <li v-for="mode in group.modes" :key="mode.title">
            <label v-if="mode.id" class="mode-option">
              <input v-model="gameMode" type="radio" name="game-mode" :value="mode.id"
                :aria-labelledby="'mode-title-' + mode.id" :aria-describedby="'mode-description-' + mode.id" />
              <span class="mode-copy">
                <strong :id="'mode-title-' + mode.id">{{ mode.title }}</strong>
                <span :id="'mode-description-' + mode.id">{{ mode.description }}</span>
              </span>
            </label>
            <div v-else class="mode-preview">
              <div class="mode-preview-heading">
                <strong>{{ mode.title }}</strong>
                <StatusBadge>Coming soon</StatusBadge>
              </div>
              <p>{{ mode.description }}</p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </fieldset>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import StatusBadge from './StatusBadge.vue'

const gameMode = defineModel({ type: String, required: true })

const groups = [
  {
    id: 'social', title: 'Social Play', icon: 'court',
    modes: [
      { id: 'rotation', title: 'Player Rotation', description: 'Build a schedule that rotates players between matches.' },
      { id: 'mexicano', title: 'Mexicano', description: 'Rotate doubles partners based on the individual standings.' },
      { title: 'Open Play Queue', description: 'Call players from a queue as each court opens up.' },
      { title: 'King of the Court', description: 'The winner stays on court to face the next challenger.' },
      { title: 'Court Ladder', description: 'Winners move up a court and losers move down.' },
    ],
  },
  {
    id: 'tournament', title: 'Tournaments', icon: 'ranking',
    modes: [
      { id: 'roundRobin', title: 'Round Robin', description: 'Every player or fixed pair faces every other entry.' },
      { id: 'knockout', title: 'Knockout', description: 'Win to advance through the bracket.' },
      { title: 'Groups → Knockout', description: 'The top finishers in each group advance to the bracket.' },
      { title: 'Knockout + Plate', description: 'First-match losers enter a separate bracket.' },
      { title: 'Double Elimination', description: 'A second loss eliminates the player or pair.' },
      { title: 'Swiss', description: 'Each round matches entries with similar records.' },
    ],
  },
  {
    id: 'team', title: 'Team Play', icon: 'players',
    modes: [
      { id: 'club', title: 'Club vs Club', description: 'Schedule players or fixed pairs from different clubs.' },
      { title: 'Team Tie', description: 'Win the most matches across a lineup of singles and doubles.' },
      { title: 'Team Relay', description: 'Pass the running team score to the next player or pair.' },
      { title: 'Club League / Box League', description: 'Play across multiple weeks with standings or divisions.' },
    ],
  },
]

const selectedGroup = computed(() => groups.find((group) => group.modes.some((mode) => mode.id === gameMode.value)))
const selectedMode = computed(() => selectedGroup.value?.modes.find((mode) => mode.id === gameMode.value))
const expandedGroup = ref(null)
</script>

<style scoped>
.mode-picker { min-width: 0; border: 0; }
.field-label { margin-bottom: 8px; font-size: 15px; font-weight: 700; }
.mode-groups { display: grid; gap: 8px; }
.mode-group {
  min-width: 0;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-control);
  background: var(--input-bg);
}
.group-heading { font: inherit; }
.group-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 56px;
  padding: 8px 12px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}
.group-toggle:hover, .group-toggle[aria-expanded="true"] { background: var(--surface-raised); }
.group-toggle > .app-icon { flex: 0 0 auto; color: var(--text-secondary); }
.group-icon {
  display: grid;
  place-items: center;
  flex: 0 0 32px;
  height: 32px;
  border-radius: var(--radius-control);
  background: var(--tag-bg);
  color: var(--primary);
}
.group-icon .app-icon { width: 18px; height: 18px; }
.group-title { flex: 1; font-weight: 750; }
.group-selection { color: var(--primary); font-size: 13px; text-align: right; }
.mode-list { padding: 4px 12px 8px; list-style: none; }
.mode-list > li + li { border-top: 1px solid var(--border); }
.mode-option {
  position: relative;
  display: block;
  margin: 6px 0;
  padding: 10px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-control);
  cursor: pointer;
}
.mode-option:has(input:checked) { border-color: var(--primary); background: var(--primary-bg); }
.mode-option:has(input:focus-visible) { outline: 2px solid var(--primary); outline-offset: 2px; }
.mode-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  clip-path: inset(50%);
}
.mode-copy { display: grid; gap: 2px; }
.mode-preview { padding: 10px; }
.mode-preview-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; }
.mode-copy > span, .mode-preview p { color: var(--text-secondary); font-size: 14px; }
.mode-preview p { margin-top: 2px; }
</style>
