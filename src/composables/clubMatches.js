import { generateId, shuffle } from './useRotation.js'

export function randomClubMatches(clubs, count, numCourts) {
  const played = new Map()
  const teamsInRound = new Set()
  const gamesPlayed = (entry) => played.get(entry.id) ?? 0
  const teamIsAvailable = (team) => !teamsInRound.has(team.id)

  return Array.from({ length: count }, () => {
    let availableClubs = clubs.filter((club) => club.teams.some(teamIsAvailable))
    if (teamsInRound.size === numCourts * 2 || availableClubs.length < 2) {
      teamsInRound.clear()
      availableClubs = clubs
    }

    const clubsByGames = shuffle(availableClubs).sort((a, b) => gamesPlayed(a) - gamesPlayed(b))
    const sides = clubsByGames.slice(0, 2).map((club) => {
      const [team] = shuffle(club.teams.filter(teamIsAvailable)).sort((a, b) => gamesPlayed(a) - gamesPlayed(b))
      teamsInRound.add(team.id)
      played.set(club.id, gamesPlayed(club) + 1)
      played.set(team.id, gamesPlayed(team) + 1)
      return team.id
    })
    const [home, away] = shuffle(sides)
    return { home, away }
  })
}

export function groupClubMatches(matches, numCourts) {
  const rounds = []
  const teamsInRound = new Set()
  let currentRound = []

  for (const match of matches) {
    const teams = [match.home, match.away].filter((teamId) => teamId !== null)
    if (currentRound.length === numCourts || teams.some((teamId) => teamsInRound.has(teamId))) {
      rounds.push(currentRound)
      currentRound = []
      teamsInRound.clear()
    }
    currentRound.push(match)
    teams.forEach((teamId) => teamsInRound.add(teamId))
  }

  if (currentRound.length) rounds.push(currentRound)
  return rounds
}

export function createClubGame(clubs, plannedRounds, teams, numCourts) {
  const playerIds = (team) => team.players.map((player) => player.id)

  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    mode: 'club',
    numCourts,
    players: clubs.flatMap((club) => club.teams.flatMap((team) =>
      team.players.map((player) => ({ id: player.id, name: player.name.trim() }))
    )),
    clubs: clubs.map((club) => ({
      id: club.id,
      name: club.name.trim(),
      teams: club.teams.map((team) => ({ id: team.id, playerIds: playerIds(team) })),
    })),
    rounds: plannedRounds.map((matches, index) => ({
      num: index + 1,
      resting: [],
      courts: matches.map(({ home, away }, courtIndex) => ({
        court: courtIndex + 1,
        pair1: playerIds(teams.get(home).team),
        pair2: playerIds(teams.get(away).team),
        score1: null,
        score2: null,
      })),
    })),
  }
}
