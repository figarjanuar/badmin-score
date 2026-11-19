import { computed } from 'vue'
import { getMatchResult, getMatchSets } from './matchScores.js'

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

  const clubByPlayer = computed(() => {
    const clubs = new Map()
    for (const club of game.value?.clubs || []) {
      for (const team of club.teams) {
        for (const id of team.playerIds) clubs.set(id, club)
      }
    }
    return clubs
  })

  const clubStandings = computed(() => {
    const stats = new Map((game.value?.clubs || []).map(({ id, name }) => [
      id, { id, name, wins: 0, losses: 0, pointDiff: 0, gamesPlayed: 0, totalGames: 0 },
    ]))

    for (const round of game.value?.rounds || []) {
      for (const court of round.courts) {
        const home = stats.get(clubByPlayer.value.get(court.pair1[0])?.id)
        const away = stats.get(clubByPlayer.value.get(court.pair2[0])?.id)
        if (!home || !away) continue

        home.totalGames++
        away.totalGames++
        const result = getMatchResult(getMatchSets(court))
        if (!result) continue
        home.gamesPlayed++
        away.gamesPlayed++
        home.pointDiff += result.pointDiff
        away.pointDiff -= result.pointDiff
        if (result.winner === 1) {
          home.wins++
          away.losses++
        } else {
          away.wins++
          home.losses++
        }
      }
    }

    const compare = (a, b) => b.winRatio - a.winRatio || b.pointDiff - a.pointDiff
    const list = [...stats.values()]
      .map((club) => ({ ...club, winRatio: club.wins / (club.gamesPlayed || 1) }))
      .sort(compare)

    let rank = 1
    return list.map((club, index) => {
      if (index > 0 && compare(club, list[index - 1]) !== 0) rank = index + 1
      return { ...club, rank, winRate: Math.round(club.winRatio * 100) }
    })
  })

  const standings = computed(() => {
    if (!game.value) return []
    if (game.value.mode === 'club') return clubStandings.value
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
        const result = getMatchResult(getMatchSets(court), true)
        if (!result) continue

        const pair1 = court.pair1
        const pair2 = court.pair2
        const p1Won = result.winner === 1
        const p2Won = result.winner === 2
        const { pointDiff } = result

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
        const homeClub = clubByPlayer.value.get(court.pair1[0])?.name
        const awayClub = clubByPlayer.value.get(court.pair2[0])?.name
        matches.push({
          key: `R${round.num}C${court.court}`,
          round: round.num,
          court: court.court,
          home: [homeClub, pair1.join(' / ')].filter(Boolean).join(' · '),
          away: [awayClub, pair2.join(' / ')].filter(Boolean).join(' · '),
          sets: getMatchSets(court),
        })
      }
    }
    return matches
  })

  return { rotationTotals, playerMap, standings, allMatches, clubByPlayer }
}
