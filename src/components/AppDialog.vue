<template>
  <dialog ref="dialog" class="app-dialog surface" :aria-labelledby="titleId" @cancel.prevent="close" @click.self="close">
    <div>
      <header class="dialog-header">
        <h2 :id="titleId">{{ title }}</h2>
        <button type="button" class="action-button ghost icon dialog-close" :aria-label="'Close ' + title" @click="close">
          <AppIcon name="close" />
        </button>
      </header>
      <div class="dialog-body">
        <slot />
      </div>
      <footer v-if="$slots.actions" class="dialog-actions">
        <slot name="actions" />
      </footer>
    </div>
  </dialog>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
import AppIcon from './AppIcon.vue'

defineProps({ title: { type: String, required: true } })
const emit = defineEmits(['close'])
const dialog = ref(null)
const titleId = useId()

onMounted(() => dialog.value.showModal())
onBeforeUnmount(() => dialog.value?.close())

function close() {
  dialog.value.close()
  emit('close')
}
</script>

<style scoped>
.app-dialog {
  width: min(440px, calc(100% - 32px));
  max-height: calc(100dvh - 32px);
  margin: auto;
  box-shadow: var(--shadow-popover);
  color: var(--text-primary);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.app-dialog::backdrop { background: rgb(3 8 5 / 72%); }

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px 8px 20px;
  border-bottom: 1px solid var(--border);
}

.dialog-header h2 { font-size: 18px; }

.dialog-body { padding: 16px 20px; }
.dialog-actions { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 20px 20px; }
</style>
