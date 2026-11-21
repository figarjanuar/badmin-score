import { getFinalMatchResult } from './matchScores.js'
import { generateId, shuffle } from './useRotation.js'

export const mexicanoTargets = [15, 21]
export const defaultMexicanoTarget = 21

function compareRank(a, b) {
  return b.points - a.points || b.pointDiff - a.pointDiff
}

export function getMexicanoStandings(game) {
  const stats = new Map(game.players.map((player) => [player.id, {
    ...player,
    points: 0,
    pointDiff: 0,
    gamesPlayed: 0,
    totalGames: 0,
  }]))

  for (const round of game.rounds) {
    for (const court of round.courts) {
      const result = getFinalMatchResult(court, game)
      for (const [ids, scored, conceded] of [
        [court.pair1, court.score1, court.score2],
        [court.pair2, court.score2, court.score1],
      ]) {
        for (const id of ids) {
          const player = stats.get(id)
          if (!player) continue
          player.totalGames++
          if (!result) continue
          player.gamesPlayed++
          player.points += scored
          player.pointDiff += scored - conceded
        }
      }
    }
  }

  const players = [...stats.values()].sort(compareRank)
  let previous = null
  for (const [index, player] of players.filter((item) => item.gamesPlayed > 0).entries()) {
    player.rank = previous && compareRank(previous, player) === 0 ? previous.rank : index + 1
    previous = player
  }
  return players
}

export function drawMexicanoRound(game) {
  if (game.completed || !Number.isInteger(game.numCourts) || game.numCourts < 1) return null
  if (game.rounds.some((round) => round.courts.some((court) => !getFinalMatchResult(court, game)))) return null

  const slots = game.numCourts * 4
  const players = getMexicanoStandings(game).filter((player) => !player.inactive)
  if (players.length < slots) return null

  const lastRound = game.rounds.at(-1)
  const rested = new Set(lastRound?.resting)
  const order = lastRound ? players : shuffle(players)
  order.sort((a, b) => a.totalGames - b.totalGames || Number(rested.has(b.id)) - Number(rested.has(a.id)))
  const playing = order.slice(0, slots).sort(compareRank)

  return {
    num: game.rounds.length + 1,
    resting: order.slice(slots).map((player) => player.id),
    courts: Array.from({ length: game.numCourts }, (_, index) => {
      const [first, second, third, fourth] = playing.slice(index * 4, index * 4 + 4)
      return {
        court: index + 1,
        pair1: [first.id, fourth.id],
        pair2: [second.id, third.id],
        score1: null,
        score2: null,
      }
    }),
  }
}

export function createMexicanoSession(numCourts, players, pointsTarget) {
  if (!mexicanoTargets.includes(pointsTarget)) return null
  const game = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    mode: 'mexicano',
    category: 'doubles',
    numCourts,
    players,
    pointsTarget,
    rounds: [],
    completed: false,
  }
  const firstRound = drawMexicanoRound(game)
  if (!firstRound) return null
  game.rounds.push(firstRound)
  return game
}
