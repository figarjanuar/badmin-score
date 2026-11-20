<template>
  <svg class="app-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="paths[name]" />
  </svg>
</template>

<script setup>
defineProps({ name: { type: String, required: true } })

const paths = {
  back: 'M19 12H5m7 7-7-7 7-7',
  close: 'm18 6-12 12M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'm5 12 4 4L19 6',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 2',
  share: 'M12 16V3M7 8l5-5 5 5M5 13v7h14v-7',
  players: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4-4a4 4 0 0 1 0 8',
  court: 'M5 3h14v18H5zM5 8h14M5 12h14M5 16h14M12 3v5m0 8v5',
  arrow: 'M5 12h14m-7-7 7 7-7 7',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5m8-5v5',
  cloud: 'M7 18a4 4 0 0 1-.9-7.9 6 6 0 0 1 11.6 1.4 3.3 3.3 0 0 1-.7 6.5H7',
  score: 'M4 4h16v16H4zM12 4v16M7 12h2m6 0h2',
  ranking: 'M4 20v-5h4v5m2 0V8h4v12m2 0V4h4v16M3 20h18',
  more: 'M5 12h.01m6.99 0h.01m6.99 0h.01',
  info: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 16v-4m0-4h.01',
  download: 'M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4',
}
</script>
