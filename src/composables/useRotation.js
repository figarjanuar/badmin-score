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

function bestCourtGroup(candidates, encounterCounts, gameCounts, consecutivePlays, playCountWeight = 0) {
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

          // Penalise players who have already played 2+ consecutive rounds.
          // Weight is higher than encounter penalty so rest takes priority.
          const consecutivePenalty = consecutivePlays
            ? group.reduce((sum, id) => {
                const c = consecutivePlays.get(id) || 0
                return sum + (c >= 2 ? (c - 1) * 10_000_000 : 0)
              }, 0)
            : 0

          // Penalise the group's total play count (absolute level, not just
          // spread). Used when adding rounds so players who played the fewest
          // games get priority. Weight is higher than the consecutive penalty
          // so a 1-game difference outweighs any encounter trade-off.
          const playCountPenalty = playCountWeight
            ? group.reduce((sum, id) => sum + (gameCounts.get(id) || 0), 0) * playCountWeight
            : 0

          const score = maxEncounter * 100000 + totalEncounter * 1000 + playSpread + consecutivePenalty + playCountPenalty
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
  // Each court holds 4 players → C(4,2) = 6 encounters per court per round.
  // We need C(n,2) total encounters for every player to meet every other player
  // (as partner or opponent) at least once.
  const encountersPerRound = numCourts * 6
  const totalEncountersNeeded = (totalPlayers * (totalPlayers - 1)) / 2
  return Math.max(1, Math.ceil(totalEncountersNeeded / encountersPerRound))
}

export function estimateRoundsCompletePartner(numCourts, totalPlayers) {
  const totalPairs = (totalPlayers * (totalPlayers - 1)) / 2
  const pairsPerRound = numCourts * 2
  return Math.max(1, Math.floor(totalPairs / pairsPerRound))
}

function buildRounds(numCourts, playerIds, rounds, initialGameCounts, initialEncounterCounts, initialPartnershipCounts, initialConsecutivePlays, playCountWeight = 0) {
  const gameCounts = initialGameCounts || new Map()
  if (!initialGameCounts) {
    playerIds.forEach((id) => gameCounts.set(id, 0))
  }

  const encounterCounts = initialEncounterCounts || new Map()
  const partnershipCounts = initialPartnershipCounts || new Map()
  const consecutivePlays = initialConsecutivePlays || new Map()
  if (!initialConsecutivePlays) {
    playerIds.forEach((id) => consecutivePlays.set(id, 0))
  }
  const roundsData = []

  for (let r = 0; r < rounds; r++) {
    const available = shuffle(playerIds).sort(
      (a, b) => gameCounts.get(a) - gameCounts.get(b)
    )

    const courtAssignments = []
    const playing = []

    for (let c = 0; c < numCourts; c++) {
      if (available.length < 4) break

      const group = bestCourtGroup(available, encounterCounts, gameCounts, consecutivePlays, playCountWeight)
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

    // Update consecutive play tracking
    const allPlaying = new Set(playing)
    for (const id of playerIds) {
      if (allPlaying.has(id)) {
        consecutivePlays.set(id, (consecutivePlays.get(id) || 0) + 1)
      } else {
        consecutivePlays.set(id, 0)
      }
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
  // Penalise high consecutive plays in score so the outer loop prefers balanced rest
  const maxConsecutive = Math.max(...[...consecutivePlays.values()])
  const score = encounterCounts.size * 10000 - repeatedEncounters * 100 - repeatedPartners * 1000 - gameSpread - maxConsecutive * 500

  return { roundsData, score, encounterCoverage: encounterCounts.size, maxConsecutive }
}

function buildCompletePartnerRounds(numCourts, playerIds) {
  const n = playerIds.length
  const pairsPerRound = numCourts * 2
  const playersPerRound = pairsPerRound * 2
  const totalPairs = (n * (n - 1)) / 2
  const totalRounds = estimateRoundsCompletePartner(numCourts, n)
  const totalSlots = totalRounds * pairsPerRound
  const neededRepeats = Math.max(0, totalSlots - totalPairs)

  // All C(n,2) pairs
  const allPairs = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      allPairs.push([playerIds[i], playerIds[j]])
    }
  }

  // ── Monte Carlo: every round exactly pairsPerRound pairs (all courts full) ──
  const attempts = Math.min(5000, Math.max(500, n * n * 15))
  let best = null

  for (let attempt = 0; attempt < attempts; attempt++) {
    const fresh = new Set(allPairs.map(([a, b]) => pairKey(a, b)))
    const used = new Set()
    const partnerCounts = new Map()
    const gameCounts = new Map()
    const consecutivePlays = new Map()
    playerIds.forEach((id) => {
      gameCounts.set(id, 0)
      consecutivePlays.set(id, 0)
    })
    const roundsData = []

    let failed = false
    let maxConsecutive = 0

    for (let r = 0; r < totalRounds && !failed; r++) {
      // ── Determine which players are available (respect rest constraint) ──
      let availablePlayers = playerIds.filter((id) => (consecutivePlays.get(id) || 0) < 2)

      // If not enough fresh players to fill courts, reluctantly add tired players
      // (prioritise those with the lowest consecutive count)
      if (availablePlayers.length < playersPerRound) {
        const tired = playerIds
          .filter((id) => !availablePlayers.includes(id))
          .sort((a, b) => (consecutivePlays.get(a) || 0) - (consecutivePlays.get(b) || 0))
        for (const id of tired) {
          if (availablePlayers.length >= playersPerRound) break
          availablePlayers.push(id)
        }
      }

      const availSet = new Set(availablePlayers)

      // Filter edges that only involve available players
      const freshEdges = [...fresh]
        .map((k) => k.split('-').map(Number))
        .filter(([a, b]) => availSet.has(a) && availSet.has(b))
      const repeatEdges = [...used]
        .map((k) => k.split('-').map(Number))
        .filter(([a, b]) => availSet.has(a) && availSet.has(b))

      // Try to find `pairsPerRound` disjoint pairs, prefer fresh
      let selected = greedyMatch(freshEdges, pairsPerRound, 300)

      if (!selected) {
        // Allow repeats if needed, but keep fresh priority
        const all = shuffle([...freshEdges, ...repeatEdges])
        selected = greedyMatch(all, pairsPerRound, 500)
      }

      // Last resort: relax rest constraint and try all edges
      if (!selected) {
        const allEdges = [...fresh].map((k) => k.split('-').map(Number))
        const allRepeat = [...used].map((k) => k.split('-').map(Number))
        selected = greedyMatch(shuffle([...allEdges, ...allRepeat]), pairsPerRound, 500)
      }

      if (!selected) {
        failed = true
        break
      }

      // Update tracking
      for (const [p1, p2] of selected) {
        const key = pairKey(p1, p2)
        if (fresh.has(key)) {
          fresh.delete(key)
          used.add(key)
        }
        partnerCounts.set(key, (partnerCounts.get(key) || 0) + 1)
        gameCounts.set(p1, gameCounts.get(p1) + 1)
        gameCounts.set(p2, gameCounts.get(p2) + 1)
      }

      // Update consecutive plays
      const playing = new Set(selected.flat())
      for (const id of playerIds) {
        if (playing.has(id)) {
          const c = (consecutivePlays.get(id) || 0) + 1
          consecutivePlays.set(id, c)
          if (c > maxConsecutive) maxConsecutive = c
        } else {
          consecutivePlays.set(id, 0)
        }
      }

      // Form courts
      const courts = []
      const shuffled = shuffle(selected)
      for (let c = 0; c + 1 < shuffled.length; c += 2) {
        courts.push({
          court: c / 2 + 1,
          pair1: shuffled[c],
          pair2: shuffled[c + 1],
          score1: null,
          score2: null,
        })
      }

      const resting = playerIds.filter((id) => !playing.has(id))

      roundsData.push({ num: r + 1, courts, resting })
    }

    if (failed) continue

    const unique = [...partnerCounts.entries()].filter(([, c]) => c === 1).length
    const repeated = [...partnerCounts.entries()].filter(([, c]) => c > 1).length
    const covered = partnerCounts.size
    const counts = [...gameCounts.values()]
    const gameSpread = Math.max(...counts) - Math.min(...counts)

    const score = unique * 10000 - repeated * 50000 - gameSpread * 5 - maxConsecutive * 500

    if (!best || score > best.score) {
      best = { roundsData, score, covered, totalPairs, repeats: repeated, maxConsecutive }
    }

    if (covered >= totalPairs && repeated <= neededRepeats && maxConsecutive <= 2) break
  }

  return best
}

// Greedy matching: find `target` disjoint edges from a list
function greedyMatch(edges, target, retries) {
  if (edges.length < target) return null
  for (let r = 0; r < retries; r++) {
    const shuffled = shuffle([...edges])
    const used = new Set()
    const selected = []
    for (const [u, v] of shuffled) {
      if (used.has(u) || used.has(v)) continue
      used.add(u)
      used.add(v)
      selected.push([u, v])
      if (selected.length >= target) return selected
    }
  }
  return null
}

// When adding a round, game-count balance is the top priority: players who
// played the fewest games get picked first, even if that repeats an encounter.
const ADD_ROUND_BALANCE_WEIGHT = 10_000_000

/**
 * Generate a single additional round continuing from existing game state.
 * Reconstructs tracking maps (gameCounts, encounterCounts, partnershipCounts,
 * consecutivePlays) from existing rounds so the new round respects the same
 * fairness heuristics.
 * @param {object} game — full game object with players, numCourts, rounds
 * @returns {object|null} new round object (num set to rounds.length + 1), or null if generation fails
 */
export function generateNextRound(game) {
  const playerIds = game.players.map((p) => p.id)
  const numCourts = game.numCourts

  // Reconstruct tracking maps from all existing rounds
  const gameCounts = new Map()
  const encounterCounts = new Map()
  const partnershipCounts = new Map()
  const consecutivePlays = new Map()

  playerIds.forEach((id) => {
    gameCounts.set(id, 0)
    consecutivePlays.set(id, 0)
  })

  for (const round of game.rounds) {
    const playing = new Set()

    for (const court of round.courts) {
      const group = [...court.pair1, ...court.pair2]
      group.forEach((id) => playing.add(id))

      for (const [p1, p2] of groupPairs(group)) {
        const key = pairKey(p1, p2)
        encounterCounts.set(key, (encounterCounts.get(key) || 0) + 1)
      }

      const k1 = pairKey(court.pair1[0], court.pair1[1])
      const k2 = pairKey(court.pair2[0], court.pair2[1])
      partnershipCounts.set(k1, (partnershipCounts.get(k1) || 0) + 1)
      partnershipCounts.set(k2, (partnershipCounts.get(k2) || 0) + 1)

      group.forEach((id) => gameCounts.set(id, gameCounts.get(id) + 1))
    }

    // Reconstruct consecutive plays from existing rounds
    for (const id of playerIds) {
      if (playing.has(id)) {
        consecutivePlays.set(id, (consecutivePlays.get(id) || 0) + 1)
      } else {
        consecutivePlays.set(id, 0)
      }
    }
  }

  const result = buildRounds(numCourts, playerIds, 1, gameCounts, encounterCounts, partnershipCounts, consecutivePlays, ADD_ROUND_BALANCE_WEIGHT)

  if (!result.roundsData || result.roundsData.length === 0) return null

  const newRound = result.roundsData[0]
  newRound.num = game.rounds.length + 1
  return newRound
}

export function generateSession(numCourts, players, mode = 'americano') {
  const playerIds = players.map((p) => p.id)
  const totalPlayers = playerIds.length

  if (mode === 'completePartner') {
    const best = buildCompletePartnerRounds(numCourts, playerIds)
    return {
      id: generateId(),
      createdAt: new Date().toISOString(),
      numCourts,
      players,
      rounds: best.roundsData,
      completed: false,
      rotationMode: 'completePartner',
    }
  }

  // Americano mode (default) — auto-increment rounds until full encounter coverage
  const minRounds = estimateRounds(numCourts, totalPlayers)
  const totalEncountersNeeded = (totalPlayers * (totalPlayers - 1)) / 2

  let best = null
  let roundBudget = minRounds

  while (roundBudget <= minRounds + 6) {
    const attempts = Math.min(200, Math.max(40, totalPlayers * numCourts * 4))

    for (let attempt = 0; attempt < attempts; attempt++) {
      const candidate = buildRounds(numCourts, playerIds, roundBudget)
      if (!best || candidate.score > best.score) {
        best = candidate
      }
      // Full coverage achieved — stop
      if (candidate.encounterCoverage >= totalEncountersNeeded && best.encounterCoverage >= totalEncountersNeeded) break
    }

    if (best && best.encounterCoverage >= totalEncountersNeeded) break
    roundBudget++
  }

  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    numCourts,
    players,
    rounds: best.roundsData,
    completed: false,
    rotationMode: 'americano',
  }
}
