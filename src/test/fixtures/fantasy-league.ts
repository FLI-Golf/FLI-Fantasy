import type { FantasyLeague, FantasySeasonParticipant, FantasyTournament } from '$lib/schemas/fantasy';

export const mockFantasyLeague: FantasyLeague = {
	id: 'league_test_123',
	collectionId: 'pbc_1852469691',
	collectionName: 'fantasy_league',
	title: "Test User's League - T123",
	league_owner: 'user_owner_123',
	season: '2026',
	fantasy_participants: 'participant_123',
	fantasy_tournaments: [],
	created: new Date().toISOString(),
	updated: new Date().toISOString()
};

export const mockFantasyParticipant: FantasySeasonParticipant = {
	id: 'participant_test_123',
	collectionId: 'pbc_3456789012',
	collectionName: 'fantasy_season_participants',
	user: 'user_test_456',
	league: 'league_test_123',
	status: 'approved',
	is_owner: false,
	joined_at: new Date().toISOString(),
	total_points: 0,
	created: new Date().toISOString(),
	updated: new Date().toISOString()
};

export const mockFantasyTournament: FantasyTournament = {
	id: 'fantasy_tournament_123',
	collectionId: 'pbc_fantasy_tournaments',
	collectionName: 'fantasy_tournament',
	fantasy_league: 'league_test_123',
	tournament: 'tournament_123',
	name: 'Spring Championship',
	title: 'Mar 1, 2026 - Spring Championship',
	draft_order: ['user_1', 'user_2', 'user_3'],
	created: new Date().toISOString(),
	updated: new Date().toISOString()
};

export function createMockLeague(overrides?: Partial<FantasyLeague>): FantasyLeague {
	return {
		...mockFantasyLeague,
		...overrides
	};
}

export function createMockParticipant(
	overrides?: Partial<FantasySeasonParticipant>
): FantasySeasonParticipant {
	return {
		...mockFantasyParticipant,
		...overrides
	};
}

export function createMockFantasyTournament(
	overrides?: Partial<FantasyTournament>
): FantasyTournament {
	return {
		...mockFantasyTournament,
		...overrides
	};
}
