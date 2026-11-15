import { computed } from 'vue'

/**
 * Standings + rotation stats derived from a game. Shared by ScoreboardView
 * and RotationView's Klasemen tab so both render identical tables.
 *
 * @param {import('vue').ComputedRef<object|null>} game - computed ref of the
 *   game object (or null), e.g. computed(() => getGame(props.gameId))
 */
export function useStandings(game) {
  // Total games each player is scheduled for in the rotation.
  // Counted from round assignments (not scores) — can differ per player
  // because the algorithm always leaves someone resting per round.
  const rotationTotals = computed(() => {
    const totals = {}
    if (!game.value) return totals
    game.value.players.forEach((p) => { totals[p.id] = 0 })
    for (const round of game.value.rounds) {
      for (const court of round.courts) {
        for (const id of [...court.pair1, ...court.pair2]) {
          if (totals[id] !== undefined) totals[id]++
        }
      }
    }
    return totals
  })

  const playerMap = computed(() => {
    const m = {}
    if (game.value) {
      game.value.players.forEach((p) => { m[p.id] = p.name })
    }
    return m
  })

  const standings = computed(() => {
    if (!game.value) return []
    const playerStats = {}

    game.value.players.forEach((p) => {
      playerStats[p.id] = {
        id: p.id,
        name: p.name,
        inactive: !!p.inactive,
        wins: 0,
        losses: 0,
        pointDiff: 0,
        gamesPlayed: 0,
        totalGames: rotationTotals.value[p.id] || 0,
      }
    })

    for (const round of game.value.rounds) {
      for (const court of round.courts) {
        if (court.score1 === null || court.score2 === null) continue

        const pair1 = court.pair1
        const pair2 = court.pair2
        const p1Won = court.score1 > court.score2
        const p2Won = court.score2 > court.score1
        const pointDiff = court.score1 - court.score2

        pair1.forEach((id) => {
          if (playerStats[id]) {
            playerStats[id].gamesPlayed++
            playerStats[id].pointDiff += pointDiff
            if (p1Won) playerStats[id].wins++
            else if (p2Won) playerStats[id].losses++
          }
        })
        pair2.forEach((id) => {
          if (playerStats[id]) {
            playerStats[id].gamesPlayed++
            playerStats[id].pointDiff -= pointDiff
            if (p2Won) playerStats[id].wins++
            else if (p1Won) playerStats[id].losses++
          }
        })
      }
    }

    const list = Object.values(playerStats)
      .map((s) => ({
        ...s,
        winRate: s.gamesPlayed > 0 ? Math.round((s.wins / s.gamesPlayed) * 100) : 0,
      }))

    const hasScores = list.some((s) => s.gamesPlayed > 0)

    if (!hasScores) {
      // No scores yet — show all players in random order
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]]
      }
      return list
    }

    return list
      .filter((s) => s.gamesPlayed > 0)
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins
        if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff
        if (b.winRate !== a.winRate) return b.winRate - a.winRate
        return a.gamesPlayed - b.gamesPlayed
      })
  })

  // Flat list of every court match across all rounds, for the match history.
  const allMatches = computed(() => {
    if (!game.value) return []
    const matches = []
    for (const round of game.value.rounds) {
      for (const court of round.courts) {
        const pair1 = court.pair1.map((id) => playerMap.value[id] || `P${id}`)
        const pair2 = court.pair2.map((id) => playerMap.value[id] || `P${id}`)
        matches.push({
          key: `R${round.num}C${court.court}`,
          round: round.num,
          court: court.court,
          home: pair1.join(' / '),
          away: pair2.join(' / '),
          score1: court.score1,
          score2: court.score2,
        })
      }
    }
    return matches
  })

  return { rotationTotals, playerMap, standings, allMatches }
}
