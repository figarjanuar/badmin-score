<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h2 class="modal-title">✏️ Edit Skor</h2>
        <button class="modal-close" @click="$emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <div class="modal-players">
          <div class="modal-team team-home">
            <span class="team-name" v-for="pid in court.pair1" :key="pid">
              {{ playerName(pid) }}
            </span>
          </div>
          <span class="modal-vs">VS</span>
          <div class="modal-team team-away">
            <span class="team-name" v-for="pid in court.pair2" :key="pid">
              {{ playerName(pid) }}
            </span>
          </div>
        </div>

        <div class="modal-inputs">
          <input
            type="number"
            class="score-in"
            v-model.number="localCourt.score1"
            min="0"
            max="30"
            placeholder="0"
            inputmode="numeric"
          />
          <span class="score-colon">:</span>
          <input
            type="number"
            class="score-in"
            v-model.number="localCourt.score2"
            min="0"
            max="30"
            placeholder="0"
            inputmode="numeric"
          />
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" @click="$emit('close')">Batal</button>
        <button class="btn btn-primary" @click="save">💾 Simpan</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  court: { type: Object, required: true },
  players: { type: Array, required: true },
})
const emit = defineEmits(['close', 'save'])

const localCourt = ref(JSON.parse(JSON.stringify(props.court)))

function playerName(id) {
  return props.players.find((p) => p.id === id)?.name || `P${id}`
}

function save() {
  emit('save', JSON.parse(JSON.stringify(localCourt.value)))
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-container {
  background: var(--card-bg);
  width: 100%;
  max-width: 340px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 17px;
  margin: 0;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 20px;
}

.modal-players {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-team {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.team-home { align-items: flex-start; }
.team-away { align-items: flex-end; }

.team-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-vs {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.modal-inputs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.score-in {
  width: 80px;
  padding: 12px;
  text-align: center;
  font-size: 28px;
  font-weight: 800;
  border: 2px solid var(--border);
  border-radius: 12px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.score-in:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
}

.score-colon {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  gap: 8px;
  padding: 0 20px 20px;
}

.modal-footer .btn {
  flex: 1;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
}
.btn:active { opacity: 0.8; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-primary);
}
</style>
