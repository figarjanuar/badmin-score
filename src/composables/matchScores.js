export function getMatchSets(court) {
  return [court, ...(court.extraSets || [])]
}

export function hasSetScore({ score1, score2 }) {
  return Number.isFinite(score1) || Number.isFinite(score2)
}

export const matchStatusLabels = {
  pending: 'Not started',
  live: 'In progress',
  finished: 'Finished',
}

export function getFinalMatchResult(court, game) {
  const legacyResult = court.confirmed === undefined && game.completed
  if (court.confirmed !== true && !legacyResult) return null

  return getMatchResult(getMatchSets(court), game.mode !== 'club')
}

export function getCourtStatus(court, game) {
  if (getFinalMatchResult(court, game)) return 'finished'
  return getMatchSets(court).some(hasSetScore) ? 'live' : 'pending'
}

export function getMatchResult(sets, allowDraw = false) {
  let homeWins = 0
  let awayWins = 0
  let pointDiff = 0

  for (const { score1, score2 } of sets) {
    if (!Number.isFinite(score1) || !Number.isFinite(score2)) return null
    const diff = score1 - score2
    if (diff > 0) homeWins++
    else if (diff < 0) awayWins++
    else if (!allowDraw) return null
    pointDiff += diff
  }

  const winner = homeWins > awayWins ? 1 : awayWins > homeWins ? 2 : 0
  return winner || allowDraw ? { winner, pointDiff } : null
}
