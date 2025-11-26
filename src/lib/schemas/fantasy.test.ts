import { describe, it, expect } from 'vitest';
import {
	fantasySeasonCreateSchema,
	fantasySeasonRecordSchema,
	fantasySeasonParticipantRecordSchema
} from './fantasy';

describe('Fantasy Schemas', () => {
	describe('fantasySeasonCreateSchema', () => {
		it('should validate valid season creation input', () => {
			const validInput = {
				name: 'Spring 2024',
				description: 'A fun spring league',
				max_participants: 12
			};

			const result = fantasySeasonCreateSchema.parse(validInput);

			expect(result.name).toBe('Spring 2024');
			expect(result.max_participants).toBe(12);
		});

		it('should apply default max_participants', () => {
			const input = {
				name: 'Test Season'
			};

			const result = fantasySeasonCreateSchema.parse(input);

			expect(result.max_participants).toBe(12);
		});

		it('should reject name shorter than 3 characters', () => {
			const invalidInput = {
				name: 'AB'
			};

			expect(() => fantasySeasonCreateSchema.parse(invalidInput)).toThrow();
		});

		it('should reject max_participants below 2', () => {
			const invalidInput = {
				name: 'Test Season',
				max_participants: 1
			};

			expect(() => fantasySeasonCreateSchema.parse(invalidInput)).toThrow();
		});

		it('should reject max_participants above 100', () => {
			const invalidInput = {
				name: 'Test Season',
				max_participants: 101
			};

			expect(() => fantasySeasonCreateSchema.parse(invalidInput)).toThrow();
		});

		it('should accept optional description', () => {
			const input = {
				name: 'Test Season'
			};

			const result = fantasySeasonCreateSchema.parse(input);

			expect(result.description).toBeUndefined();
		});

		it('should accept optional dates', () => {
			const input = {
				name: 'Test Season',
				start_date: '2024-01-01T00:00:00.000Z',
				end_date: '2024-12-31T23:59:59.999Z'
			};

			const result = fantasySeasonCreateSchema.parse(input);

			expect(result.start_date).toBe('2024-01-01T00:00:00.000Z');
			expect(result.end_date).toBe('2024-12-31T23:59:59.999Z');
		});
	});

	describe('fantasySeasonRecordSchema', () => {
		it('should validate complete season record', () => {
			const record = {
				id: 'season_123',
				collectionId: 'pbc_1852469691',
				collectionName: 'fantasy_seasons',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				name: 'Test Season',
				description: 'A test season',
				owner: 'user_123',
				status: 'filling' as const,
				max_participants: 12,
				participants_count: 1,
				schedule_generated: false,
				start_date: '2024-01-01',
				end_date: '2024-12-31'
			};

			const result = fantasySeasonRecordSchema.parse(record);

			expect(result.id).toBe('season_123');
			expect(result.status).toBe('filling');
		});

		it('should accept all valid status values', () => {
			const statuses = ['filling', 'active', 'completed', 'cancelled'] as const;

			statuses.forEach((status) => {
				const record = {
					id: 'season_123',
					created: '2024-01-01T00:00:00.000Z',
					updated: '2024-01-01T00:00:00.000Z',
					name: 'Test Season',
					owner: 'user_123',
					status,
					max_participants: 12,
					participants_count: 1,
					schedule_generated: false
				};

				expect(() => fantasySeasonRecordSchema.parse(record)).not.toThrow();
			});
		});

		it('should reject invalid status', () => {
			const record = {
				id: 'season_123',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				name: 'Test Season',
				owner: 'user_123',
				status: 'invalid_status',
				max_participants: 12,
				participants_count: 1,
				schedule_generated: false
			};

			expect(() => fantasySeasonRecordSchema.parse(record)).toThrow();
		});
	});

	describe('fantasySeasonParticipantRecordSchema', () => {
		it('should validate complete participant record', () => {
			const record = {
				id: 'participant_123',
				collectionId: 'pbc_3456789012',
				collectionName: 'fantasy_season_participants',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				season: 'season_123',
				user: 'user_456',
				is_owner: false,
				joined_at: '2024-01-01T00:00:00.000Z',
				total_points: 100
			};

			const result = fantasySeasonParticipantRecordSchema.parse(record);

			expect(result.season).toBe('season_123');
			expect(result.user).toBe('user_456');
			expect(result.is_owner).toBe(false);
			expect(result.total_points).toBe(100);
		});

		it('should accept optional total_points', () => {
			const record = {
				id: 'participant_123',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				season: 'season_123',
				user: 'user_456',
				is_owner: false,
				joined_at: '2024-01-01T00:00:00.000Z'
			};

			const result = fantasySeasonParticipantRecordSchema.parse(record);

			expect(result.total_points).toBeUndefined();
		});
	});
});
