import { getMatchCategory, mixedGroups } from './matchCategories.js'
import { getFinalMatchResult, getMatchSets } from './matchScores.js'
import { isTournamentMode } from './sessionModes.js'
import { generateId, shuffle } from './useRotation.js'

function scheduleMatches(game, batches, stage) {
  const entries = new Map(game.entries.map((entry) => [entry.id, entry.playerIds]))
  const rounds = []
  for (const matches of batches) {
    for (let index = 0; index < matches.length; index += game.numCourts) {
      rounds.push({
        num: game.rounds.length + rounds.length + 1,
        ...(stage ? { stage } : {}),
        resting: [],
        courts: matches.slice(index, index + game.numCourts).map((match, index) => ({
          ...match,
          court: index + 1,
          pair1: entries.get(match.entry1),
          pair2: entries.get(match.entry2),
          score1: null,
          score2: null,
        })),
      })
    }
  }
  return rounds
}

function roundRobinBatches(entryIds) {
  const order = [...entryIds]
  if (order.length % 2) order.push(null)
  return Array.from({ length: order.length - 1 }, () => {
    const matches = []
    for (let index = 0; index < order.length / 2; index++) {
      const entry1 = order[index]
      const entry2 = order[order.length - 1 - index]
      if (entry1 !== null && entry2 !== null) matches.push({ entry1, entry2 })
    }
    order.splice(1, 0, order.pop())
    return matches
  })
}

function knockoutSeeds(entryIds) {
  const entrants = shuffle(entryIds)
  const size = 2 ** Math.ceil(Math.log2(entrants.length))
  let seedOrder = [1, 2]
  for (let bracketSize = 4; bracketSize <= size; bracketSize *= 2) {
    seedOrder = seedOrder.flatMap((seed) => [seed, bracketSize + 1 - seed])
  }
  return seedOrder.map((seed) => entrants[seed - 1] ?? null)
}

export function createTournament(mode, category, numCourts, roster) {
  if (!isTournamentMode(mode) || !Number.isInteger(numCourts) || numCourts < 1 || roster.length < 2) return null
  const { sideSize } = getMatchCategory(category)
  if (roster.some((side) => side.length !== sideSize || side.some((name) => !name.trim()))) return null

  const players = []
  const entries = roster.map((side, index) => ({
    id: index + 1,
    playerIds: side.map((name, playerIndex) => {
      const id = players.length + 1
      const player = { id, name: name.trim() }
      if (category === 'mixed') player.mixedGroup = mixedGroups[playerIndex].id
      players.push(player)
      return id
    }),
  }))
  const entryIds = entries.map((entry) => entry.id)
  const game = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    mode,
    category,
    numCourts,
    entries,
    players,
    rounds: [],
    completed: false,
  }
  if (mode === 'roundRobin') {
    game.rounds = scheduleMatches(game, roundRobinBatches(entryIds))
  } else {
    game.bracketSeeds = knockoutSeeds(entryIds)
    game.rounds = drawKnockoutStage(game)
  }
  return game
}

export function getKnockoutStageLabel(size) {
  if (size === 2) return 'Final'
  if (size === 4) return 'Semifinals'
  if (size === 8) return 'Quarterfinals'
  return 'Round of ' + size
}

export function getKnockoutBracket(game) {
  const scheduled = new Map()
  for (const round of game.rounds) {
    for (const court of round.courts) {
      scheduled.set(`${round.stage}-${court.slot}`, { court, round: round.num })
    }
  }

  const stages = []
  let entrants = game.bracketSeeds
  while (entrants.length > 1) {
    const stage = stages.length + 1
    const matches = Array.from({ length: entrants.length / 2 }, (_, slot) => {
      const [entry1, entry2] = entrants.slice(slot * 2, slot * 2 + 2)
      const match = scheduled.get(`${stage}-${slot}`)
      const bye = stage === 1 && (entry1 === null || entry2 === null)
      const result = match && getFinalMatchResult(match.court, game)
      const winner = bye ? entry1 ?? entry2 : result?.winner === 1 ? entry1 : result?.winner === 2 ? entry2 : null
      return { slot, entry1, entry2, bye, winner, ...match }
    })
    stages.push({ stage, label: getKnockoutStageLabel(entrants.length), matches })
    entrants = matches.map((match) => match.winner)
  }
  return stages
}

export function drawKnockoutStage(game, bracket = getKnockoutBracket(game)) {
  if (game.completed) return []
  const activeStage = game.rounds.at(-1)?.stage ?? 0
  const next = bracket[activeStage]
  if (!next) return []
  const fixtures = next.matches.filter((match) => !match.bye)
  if (!fixtures.every(({ entry1, entry2 }) => entry1 !== null && entry2 !== null)) return []
  const matches = fixtures.map(({ entry1, entry2, slot }) => ({ entry1, entry2, slot }))
  return scheduleMatches(game, [matches], next.stage)
}

export function getTournamentEntryNames(game) {
  const players = new Map(game.players.map((player) => [player.id, player.name]))
  return new Map(game.entries.map((entry) => [
    entry.id, entry.playerIds.map((id) => players.get(id) || `P${id}`).join(' / '),
  ]))
}

export function getRoundRobinStandings(game) {
  const names = getTournamentEntryNames(game)
  const stats = new Map(game.entries.map(({ id }) => [id, {
    id, name: names.get(id), wins: 0, losses: 0, setDiff: 0, pointDiff: 0, gamesPlayed: 0, totalGames: 0,
  }]))

  for (const round of game.rounds) {
    for (const court of round.courts) {
      const home = stats.get(court.entry1)
      const away = stats.get(court.entry2)
      home.totalGames++
      away.totalGames++
      const result = getFinalMatchResult(court, game)
      if (!result) continue
      const [winner, loser] = result.winner === 1 ? [home, away] : [away, home]
      winner.wins++
      loser.losses++
      home.gamesPlayed++
      away.gamesPlayed++
      const setDiff = getMatchSets(court).reduce((diff, set) => diff + Math.sign(set.score1 - set.score2), 0)
      home.setDiff += setDiff
      away.setDiff -= setDiff
      home.pointDiff += result.pointDiff
      away.pointDiff -= result.pointDiff
    }
  }
  const compare = (a, b) => b.wins - a.wins || b.setDiff - a.setDiff || b.pointDiff - a.pointDiff
  const standings = [...stats.values()].sort(compare)
  for (const [index, entry] of standings.entries()) {
    const previous = standings[index - 1]
    entry.rank = previous && compare(previous, entry) === 0 ? previous.rank : index + 1
  }
  return standings
}
