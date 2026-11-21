export const matchCategories = [
  { id: 'singles', label: 'Singles (1v1)', sideSize: 1 },
  { id: 'doubles', label: 'Doubles (2v2)', sideSize: 2 },
  { id: 'mixed', label: 'Mixed Doubles', sideSize: 2 },
]

export const mixedGroups = [
  { id: 'man', label: 'Man' },
  { id: 'woman', label: 'Woman' },
]

export function getMatchCategory(id) {
  return matchCategories.find((category) => category.id === id) ?? matchCategories[1]
}

export function hasCourtRoster(category, numCourts, players) {
  if (category === 'mixed') {
    return players.every((player) => mixedGroups.some(({ id }) => id === player.mixedGroup))
      && mixedGroups.every(({ id }) =>
        players.filter((player) => player.mixedGroup === id).length >= numCourts * 2
      )
  }
  return players.length >= numCourts * getMatchCategory(category).sideSize * 2
}
