function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function partnershipKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

function bestPairing(pool, partnershipCounts) {
  // pool is 4 player ids
  // There are 3 ways to split 4 players into 2 pairs
  // Pick the one that minimizes maximum (and total) repeat partnerships
  const [p1, p2, p3, p4] = pool
  const pairings = [
    { pair1: [p1, p2], pair2: [p3, p4] },
    { pair1: [p1, p3], pair2: [p2, p4] },
    { pair1: [p1, p4], pair2: [p2, p3] },
  ]

  let best = null
  let bestScore = Infinity

  for (const pairing of pairings) {
    const scores = []
    for (const pair of [pairing.pair1, pairing.pair2]) {
      const key = partnershipKey(pair[0], pair[1])
      scores.push(partnershipCounts.get(key) || 0)
    }
    const maxScore = Math.max(...scores)
    const totalScore = scores.reduce((a, b) => a + b, 0)
    // Prefer lower max, then lower total
    const score = maxScore * 1000 + totalScore
    if (score < bestScore) {
      bestScore = score
      best = pairing
    }
  }

  return best
}

export function generateSession(numCourts, players) {
  const playerIds = players.map((p) => p.id)
  const totalPlayers = playerIds.length
  const slotsPerRound = numCourts * 4

  // Calculate rounds so each player plays about 4 games
  const targetGames = 4
  const rounds = Math.max(
    1,
    Math.ceil((totalPlayers * targetGames) / slotsPerRound)
  )

  const gameCounts = new Map()
  playerIds.forEach((id) => gameCounts.set(id, 0))

  const partnershipCounts = new Map()
  const roundsData = []

  for (let r = 0; r < rounds; r++) {
    // Sort players by game count (least played first), shuffled for ties
    const sorted = shuffle(playerIds).sort(
      (a, b) => gameCounts.get(a) - gameCounts.get(b)
    )

    const playing = sorted.slice(0, slotsPerRound)
    const resting = sorted.slice(slotsPerRound)

    // Assign to courts
    const courtAssignments = []
    for (let c = 0; c < numCourts; c++) {
      const pool = playing.slice(c * 4, c * 4 + 4)
      if (pool.length < 4) break

      const { pair1, pair2 } = bestPairing(pool, partnershipCounts)

      // Update partnership counts
      const k1 = partnershipKey(pair1[0], pair1[1])
      const k2 = partnershipKey(pair2[0], pair2[1])
      partnershipCounts.set(k1, (partnershipCounts.get(k1) || 0) + 1)
      partnershipCounts.set(k2, (partnershipCounts.get(k2) || 0) + 1)

      // Update game counts
      pool.forEach((id) => gameCounts.set(id, gameCounts.get(id) + 1))

      courtAssignments.push({
        court: c + 1,
        pair1,
        pair2,
        score1: null,
        score2: null,
      })
    }

    roundsData.push({
      num: r + 1,
      courts: courtAssignments,
      resting,
    })
  }

  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    numCourts,
    players,
    rounds: roundsData,
    completed: false,
  }
}
