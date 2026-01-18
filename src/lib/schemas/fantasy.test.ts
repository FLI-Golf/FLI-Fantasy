import { describe, it, expect } from 'vitest';
import {
	fantasyLeagueCreateSchema,
	fantasyLeagueRecordSchema,
	fantasySeasonParticipantSchema,
	fantasyTournamentSchema,
	tournamentSchema,
	fantasySettingsSchema
} from './fantasy';

describe('Fantasy Schemas', () => {
	describe('fantasyLeagueCreateSchema', () => {
		it('should validate valid league creation input with season', () => {
			const validInput = {
				season: '2026'
			};

			const result = fantasyLeagueCreateSchema.parse(validInput);

			expect(result.season).toBe('2026');
		});

		it('should apply default season when not provided', () => {
			const input = {};

			const result = fantasyLeagueCreateSchema.parse(input);

			expect(result.season).toBe('2026');
		});

		it('should accept all valid season values', () => {
			const seasons = ['2026', '2027', '2028'] as const;

			seasons.forEach((season) => {
				const result = fantasyLeagueCreateSchema.parse({ season });
				expect(result.season).toBe(season);
			});
		});

		it('should reject invalid season value', () => {
			const invalidInput = {
				season: '2025'
			};

			expect(() => fantasyLeagueCreateSchema.parse(invalidInput)).toThrow();
		});
	});

	describe('fantasyLeagueRecordSchema', () => {
		it('should validate complete league record', () => {
			const record = {
				id: 'league_123',
				collectionId: 'pbc_1852469691',
				collectionName: 'fantasy_league',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				title: "John's League - ABC1",
				league_owner: 'user_123',
				season: '2026' as const,
				fantasy_participants: 'participant_123',
				fantasy_tournaments: ['tournament_1', 'tournament_2']
			};

			const result = fantasyLeagueRecordSchema.parse(record);

			expect(result.id).toBe('league_123');
			expect(result.title).toBe("John's League - ABC1");
			expect(result.league_owner).toBe('user_123');
			expect(result.season).toBe('2026');
		});

		it('should accept all valid season values in record', () => {
			const seasons = ['2026', '2027', '2028'] as const;

			seasons.forEach((season) => {
				const record = {
					id: 'league_123',
					created: '2024-01-01T00:00:00.000Z',
					updated: '2024-01-01T00:00:00.000Z',
					title: 'Test League',
					league_owner: 'user_123',
					season
				};

				expect(() => fantasyLeagueRecordSchema.parse(record)).not.toThrow();
			});
		});

		it('should reject invalid season in record', () => {
			const record = {
				id: 'league_123',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				title: 'Test League',
				league_owner: 'user_123',
				season: 'invalid_season'
			};

			expect(() => fantasyLeagueRecordSchema.parse(record)).toThrow();
		});

		it('should accept optional fields', () => {
			const record = {
				id: 'league_123',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				title: 'Test League',
				league_owner: 'user_123'
			};

			const result = fantasyLeagueRecordSchema.parse(record);

			expect(result.fantasy_participants).toBeUndefined();
			expect(result.fantasy_tournaments).toBeUndefined();
			expect(result.settings).toBeUndefined();
		});

		it('should accept tournaments as string or array', () => {
			const recordWithString = {
				id: 'league_123',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				title: 'Test League',
				league_owner: 'user_123',
				tournaments: 'tournament_123'
			};

			const recordWithArray = {
				id: 'league_123',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				title: 'Test League',
				league_owner: 'user_123',
				tournaments: ['tournament_1', 'tournament_2']
			};

			expect(() => fantasyLeagueRecordSchema.parse(recordWithString)).not.toThrow();
			expect(() => fantasyLeagueRecordSchema.parse(recordWithArray)).not.toThrow();
		});
	});

	describe('fantasySeasonParticipantSchema', () => {
		it('should validate complete participant record', () => {
			const record = {
				id: 'participant_123',
				collectionId: 'pbc_3456789012',
				collectionName: 'fantasy_season_participants',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				user: 'user_456',
				league: 'league_123',
				status: 'approved' as const,
				is_owner: false,
				joined_at: '2024-01-01T00:00:00.000Z',
				approved_at: '2024-01-02T00:00:00.000Z',
				total_points: 100
			};

			const result = fantasySeasonParticipantSchema.parse(record);

			expect(result.user).toBe('user_456');
			expect(result.league).toBe('league_123');
			expect(result.status).toBe('approved');
			expect(result.is_owner).toBe(false);
			expect(result.total_points).toBe(100);
		});

		it('should accept all valid status values', () => {
			const statuses = ['pending', 'approved', 'rejected'] as const;

			statuses.forEach((status) => {
				const record = {
					id: 'participant_123',
					created: '2024-01-01T00:00:00.000Z',
					updated: '2024-01-01T00:00:00.000Z',
					user: 'user_456',
					is_owner: false,
					joined_at: '2024-01-01T00:00:00.000Z',
					status
				};

				expect(() => fantasySeasonParticipantSchema.parse(record)).not.toThrow();
			});
		});

		it('should accept optional fields', () => {
			const record = {
				id: 'participant_123',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				user: 'user_456',
				is_owner: false,
				joined_at: '2024-01-01T00:00:00.000Z'
			};

			const result = fantasySeasonParticipantSchema.parse(record);

			expect(result.league).toBeUndefined();
			expect(result.status).toBeUndefined();
			expect(result.approved_at).toBeUndefined();
			expect(result.total_points).toBeUndefined();
		});

		it('should validate owner participant', () => {
			const record = {
				id: 'participant_123',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				user: 'user_owner',
				is_owner: true,
				joined_at: '2024-01-01T00:00:00.000Z',
				status: 'approved' as const
			};

			const result = fantasySeasonParticipantSchema.parse(record);

			expect(result.is_owner).toBe(true);
		});
	});

	describe('tournamentSchema', () => {
		it('should validate complete tournament record', () => {
			const record = {
				id: 'tournament_123',
				name: 'Spring Championship',
				start_date: '2024-03-01',
				end_date: '2024-03-03',
				status: 'upcoming' as const,
				season: '2026' as const,
				course: 'course_123'
			};

			const result = tournamentSchema.parse(record);

			expect(result.id).toBe('tournament_123');
			expect(result.name).toBe('Spring Championship');
			expect(result.status).toBe('upcoming');
		});

		it('should accept all valid status values', () => {
			const statuses = ['next', 'upcoming', 'in_progress', 'completed'] as const;

			statuses.forEach((status) => {
				const record = {
					id: 'tournament_123',
					name: 'Test Tournament',
					start_date: '2024-03-01',
					end_date: '2024-03-03',
					status
				};

				expect(() => tournamentSchema.parse(record)).not.toThrow();
			});
		});

		it('should accept optional fields', () => {
			const record = {
				id: 'tournament_123',
				name: 'Test Tournament',
				start_date: '2024-03-01',
				end_date: '2024-03-03'
			};

			const result = tournamentSchema.parse(record);

			expect(result.status).toBeUndefined();
			expect(result.season).toBeUndefined();
			expect(result.course).toBeUndefined();
		});
	});

	describe('fantasyTournamentSchema', () => {
		it('should validate complete fantasy tournament record', () => {
			const record = {
				id: 'fantasy_tournament_123',
				collectionId: 'pbc_fantasy_tournaments',
				collectionName: 'fantasy_tournament',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				fantasy_league: 'league_123',
				tournament: 'tournament_123',
				name: 'Spring Championship',
				title: 'Mar 1, 2024 - Spring Championship',
				draft_order: ['user_1', 'user_2', 'user_3']
			};

			const result = fantasyTournamentSchema.parse(record);

			expect(result.id).toBe('fantasy_tournament_123');
			expect(result.fantasy_league).toBe('league_123');
			expect(result.draft_order).toEqual(['user_1', 'user_2', 'user_3']);
		});

		it('should accept optional fields', () => {
			const record = {
				id: 'fantasy_tournament_123',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				fantasy_league: 'league_123'
			};

			const result = fantasyTournamentSchema.parse(record);

			expect(result.tournament).toBeUndefined();
			expect(result.name).toBeUndefined();
			expect(result.title).toBeUndefined();
			expect(result.draft_order).toBeUndefined();
			expect(result.draft_results).toBeUndefined();
		});
	});

	describe('fantasySettingsSchema', () => {
		it('should validate complete settings', () => {
			const settings = {
				start_pause_interval: 60,
				rounds: 5,
				check_gender: true,
				min_participants: 6,
				auto_generate_tournaments: true
			};

			const result = fantasySettingsSchema.parse(settings);

			expect(result.start_pause_interval).toBe(60);
			expect(result.rounds).toBe(5);
			expect(result.check_gender).toBe(true);
			expect(result.min_participants).toBe(6);
			expect(result.auto_generate_tournaments).toBe(true);
		});

		it('should apply default values', () => {
			const settings = {};

			const result = fantasySettingsSchema.parse(settings);

			expect(result.start_pause_interval).toBe(60);
			expect(result.rounds).toBe(5);
			expect(result.check_gender).toBe(false);
			expect(result.min_participants).toBe(6);
			expect(result.auto_generate_tournaments).toBe(true);
		});

		it('should reject start_pause_interval below 30', () => {
			const settings = { start_pause_interval: 20 };
			expect(() => fantasySettingsSchema.parse(settings)).toThrow();
		});

		it('should reject start_pause_interval above 300', () => {
			const settings = { start_pause_interval: 400 };
			expect(() => fantasySettingsSchema.parse(settings)).toThrow();
		});

		it('should accept boundary values for start_pause_interval', () => {
			expect(() => fantasySettingsSchema.parse({ start_pause_interval: 30 })).not.toThrow();
			expect(() => fantasySettingsSchema.parse({ start_pause_interval: 300 })).not.toThrow();
		});

		it('should reject rounds below 1', () => {
			const settings = { rounds: 0 };
			expect(() => fantasySettingsSchema.parse(settings)).toThrow();
		});

		it('should reject rounds above 10', () => {
			const settings = { rounds: 11 };
			expect(() => fantasySettingsSchema.parse(settings)).toThrow();
		});

		it('should accept boundary values for rounds', () => {
			expect(() => fantasySettingsSchema.parse({ rounds: 1 })).not.toThrow();
			expect(() => fantasySettingsSchema.parse({ rounds: 10 })).not.toThrow();
		});

		it('should reject min_participants below 2', () => {
			const settings = { min_participants: 1 };
			expect(() => fantasySettingsSchema.parse(settings)).toThrow();
		});

		it('should reject min_participants above 100', () => {
			const settings = { min_participants: 101 };
			expect(() => fantasySettingsSchema.parse(settings)).toThrow();
		});

		it('should accept boundary values for min_participants', () => {
			expect(() => fantasySettingsSchema.parse({ min_participants: 2 })).not.toThrow();
			expect(() => fantasySettingsSchema.parse({ min_participants: 100 })).not.toThrow();
		});
	});
});
