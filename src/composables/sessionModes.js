const labels = {
  rotation: 'Player Rotation',
  mexicano: 'Mexicano',
  club: 'Club vs Club',
  roundRobin: 'Round Robin',
  knockout: 'Knockout',
}

export function getSessionModeLabel(mode) {
  return Object.hasOwn(labels, mode) ? labels[mode] : labels.rotation
}

export function isTournamentMode(mode) {
  return mode === 'roundRobin' || mode === 'knockout'
}
