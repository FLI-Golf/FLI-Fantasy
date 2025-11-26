import type { FantasySeason, FantasySeasonParticipant } from '$lib/schemas/fantasy';

export const mockFantasySeason: FantasySeason = {
	id: 'season_test_123',
	collectionId: 'pbc_1852469691',
	collectionName: 'fantasy_seasons',
	name: 'Test Season 2024',
	description: 'A test fantasy golf season',
	owner: 'user_owner_123',
	status: 'filling',
	max_participants: 10,
	participants_count: 1,
	schedule_generated: false,
	start_date: '2024-01-01',
	end_date: '2024-12-31',
	created: new Date().toISOString(),
	updated: new Date().toISOString()
};

export const mockFantasySeasonParticipant: FantasySeasonParticipant = {
	id: 'participant_test_123',
	collectionId: 'pbc_3456789012',
	collectionName: 'fantasy_season_participants',
	season: 'season_test_123',
	user: 'user_test_456',
	is_owner: false,
	joined_at: new Date().toISOString(),
	total_points: 0,
	created: new Date().toISOString(),
	updated: new Date().toISOString()
};

export function createMockSeason(overrides?: Partial<FantasySeason>): FantasySeason {
	return {
		...mockFantasySeason,
		...overrides
	};
}

export function createMockParticipant(
	overrides?: Partial<FantasySeasonParticipant>
): FantasySeasonParticipant {
	return {
		...mockFantasySeasonParticipant,
		...overrides
	};
}
