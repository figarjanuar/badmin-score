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

function pairKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

function groupPairs(group) {
  const pairs = []
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      pairs.push([group[i], group[j]])
    }
  }
  return pairs
}

function chooseTargetGames(totalPlayers) {
  // In Americano-style doubles, one game lets a player meet 3 people
  // (1 partner + 2 opponents). Schedule enough games so everyone can
  // encounter every other player at least once when possible.
  return Math.max(4, Math.ceil((totalPlayers - 1) / 3))
}

function bestCourtGroup(candidates, encounterCounts, gameCounts) {
  let best = null
  let bestScore = Infinity

  for (let a = 0; a < candidates.length - 3; a++) {
    for (let b = a + 1; b < candidates.length - 2; b++) {
      for (let c = b + 1; c < candidates.length - 1; c++) {
        for (let d = c + 1; d < candidates.length; d++) {
          const group = [candidates[a], candidates[b], candidates[c], candidates[d]]
          const encounters = groupPairs(group).map(
            ([p1, p2]) => encounterCounts.get(pairKey(p1, p2)) || 0
          )
          const maxEncounter = Math.max(...encounters)
          const totalEncounter = encounters.reduce((sum, count) => sum + count, 0)
          const playSpread = Math.max(...group.map((id) => gameCounts.get(id))) - Math.min(...group.map((id) => gameCounts.get(id)))

          // Strongly prefer groups where players have not shared a court yet.
          const score = maxEncounter * 100000 + totalEncounter * 1000 + playSpread
          if (score < bestScore) {
            bestScore = score
            best = group
          }
        }
      }
    }
  }

  return best
}

function bestPairing(pool, partnershipCounts) {
  // pool is 4 player ids
  // There are 3 ways to split 4 players into 2 pairs.
  // Pick the one that minimizes repeat partnerships.
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
      scores.push(partnershipCounts.get(pairKey(pair[0], pair[1])) || 0)
    }
    const maxScore = Math.max(...scores)
    const totalScore = scores.reduce((a, b) => a + b, 0)
    // Prefer lower max, then lower total.
    const score = maxScore * 1000 + totalScore
    if (score < bestScore) {
      bestScore = score
      best = pairing
    }
  }

  return best
}

export function estimateRounds(numCourts, totalPlayers) {
  const slotsPerRound = numCourts * 4
  return Math.max(
    1,
    Math.ceil((totalPlayers * chooseTargetGames(totalPlayers)) / slotsPerRound)
  )
}

function buildRounds(numCourts, playerIds, rounds) {
  const gameCounts = new Map()
  playerIds.forEach((id) => gameCounts.set(id, 0))

  const encounterCounts = new Map()
  const partnershipCounts = new Map()
  const roundsData = []

  for (let r = 0; r < rounds; r++) {
    const available = shuffle(playerIds).sort(
      (a, b) => gameCounts.get(a) - gameCounts.get(b)
    )

    const courtAssignments = []
    const playing = []

    for (let c = 0; c < numCourts; c++) {
      if (available.length < 4) break

      const group = bestCourtGroup(available, encounterCounts, gameCounts)
      if (!group) break

      for (const id of group) {
        available.splice(available.indexOf(id), 1)
      }
      playing.push(...group)

      const { pair1, pair2 } = bestPairing(group, partnershipCounts)

      // Update encounter counts for everyone who shared the same court.
      for (const [p1, p2] of groupPairs(group)) {
        const key = pairKey(p1, p2)
        encounterCounts.set(key, (encounterCounts.get(key) || 0) + 1)
      }

      // Update partnership counts separately so partner repeats are minimized.
      const k1 = pairKey(pair1[0], pair1[1])
      const k2 = pairKey(pair2[0], pair2[1])
      partnershipCounts.set(k1, (partnershipCounts.get(k1) || 0) + 1)
      partnershipCounts.set(k2, (partnershipCounts.get(k2) || 0) + 1)

      group.forEach((id) => gameCounts.set(id, gameCounts.get(id) + 1))

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
      resting: available.filter((id) => !playing.includes(id)),
    })
  }

  const repeatedEncounters = [...encounterCounts.values()].filter((count) => count > 1).length
  const repeatedPartners = [...partnershipCounts.values()].filter((count) => count > 1).length
  const counts = [...gameCounts.values()]
  const gameSpread = Math.max(...counts) - Math.min(...counts)
  const score = encounterCounts.size * 10000 - repeatedEncounters * 100 - repeatedPartners * 1000 - gameSpread

  return { roundsData, score }
}

export function generateSession(numCourts, players) {
  const playerIds = players.map((p) => p.id)
  const totalPlayers = playerIds.length
  const rounds = estimateRounds(numCourts, totalPlayers)
  const attempts = Math.min(300, Math.max(80, totalPlayers * numCourts * 8))

  let best = null
  for (let attempt = 0; attempt < attempts; attempt++) {
    const candidate = buildRounds(numCourts, playerIds, rounds)
    if (!best || candidate.score > best.score) {
      best = candidate
    }
  }

  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    numCourts,
    players,
    rounds: best.roundsData,
    completed: false,
  }
}
