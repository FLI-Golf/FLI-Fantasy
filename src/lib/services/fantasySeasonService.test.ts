import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FantasySeasonService } from './fantasySeasonService';
import { createMockSeason, createMockParticipant } from '../../test/fixtures/fantasy-season';
import type { FantasySeasonCreateInput } from '$lib/schemas/fantasy';

// Mock PocketBase
const mockCreate = vi.fn();
const mockGetOne = vi.fn();
const mockGetFullList = vi.fn();
const mockUpdate = vi.fn();

vi.mock('$lib/pocketbase', () => ({
	pb: {
		collection: vi.fn((name: string) => ({
			create: mockCreate,
			getOne: mockGetOne,
			getFullList: mockGetFullList,
			update: mockUpdate
		}))
	}
}));

describe('FantasySeasonService', () => {
	let service: FantasySeasonService;

	beforeEach(() => {
		service = new FantasySeasonService();
		vi.clearAllMocks();
	});

	describe('createSeasonForOwner', () => {
		it('should create a new fantasy season with valid input', async () => {
			const ownerId = 'user_owner_123';
			const input: FantasySeasonCreateInput = {
				name: 'Spring 2024 League',
				description: 'A fun spring golf league',
				max_participants: 12
			};

			const mockCreatedSeason = createMockSeason({
				id: 'new_season_123',
				name: input.name,
				description: input.description,
				owner: ownerId,
				status: 'filling',
				max_participants: input.max_participants,
				participants_count: 1,
				schedule_generated: false
			});

			mockCreate.mockResolvedValue(mockCreatedSeason);

			const result = await service.createSeasonForOwner(ownerId, input);

			expect(mockCreate).toHaveBeenCalledWith({
				name: input.name,
				description: input.description,
				max_participants: input.max_participants,
				owner: ownerId,
				status: 'filling',
				participants_count: 1,
				schedule_generated: false
			});

			expect(result).toEqual(mockCreatedSeason);
			expect(result.owner).toBe(ownerId);
			expect(result.status).toBe('filling');
		});

		it('should reject invalid input with validation error', async () => {
			const ownerId = 'user_owner_123';
			const invalidInput = {
				name: 'AB', // Too short (min 3 chars)
				max_participants: 12
			};

			await expect(service.createSeasonForOwner(ownerId, invalidInput)).rejects.toThrow();
		});

		it('should set default max_participants if not provided', async () => {
			const ownerId = 'user_owner_123';
			const input = {
				name: 'Test Season'
			};

			const mockCreatedSeason = createMockSeason({
				max_participants: 12 // default value
			});

			mockCreate.mockResolvedValue(mockCreatedSeason);

			await service.createSeasonForOwner(ownerId, input);

			expect(mockCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					max_participants: 12
				})
			);
		});
	});

	describe('addParticipant', () => {
		it('should add a new participant to a filling season', async () => {
			const seasonId = 'season_test_123';
			const userId = 'user_new_456';

			const mockSeason = createMockSeason({
				id: seasonId,
				status: 'filling',
				participants_count: 1
			});

			const mockParticipant = createMockParticipant({
				season: seasonId,
				user: userId,
				is_owner: false
			});

			const mockUpdatedSeason = createMockSeason({
				...mockSeason,
				participants_count: 2
			});

			mockGetOne.mockResolvedValue(mockSeason);
			mockGetFullList
				.mockResolvedValueOnce([]) // No existing participant
				.mockResolvedValueOnce([mockParticipant, {}]); // 2 total participants
			mockCreate.mockResolvedValue(mockParticipant);
			mockUpdate.mockResolvedValue(mockUpdatedSeason);

			const result = await service.addParticipant(seasonId, userId);

			expect(mockGetOne).toHaveBeenCalledWith(seasonId);
			expect(mockCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					season: seasonId,
					user: userId,
					is_owner: false
				})
			);
			expect(mockUpdate).toHaveBeenCalledWith(seasonId, {
				participants_count: 2
			});
			expect(result.season.participants_count).toBe(2);
			expect(result.participant.user).toBe(userId);
		});

		it('should return existing participant if already joined', async () => {
			const seasonId = 'season_test_123';
			const userId = 'user_existing_456';

			const mockSeason = createMockSeason({
				id: seasonId,
				status: 'filling'
			});

			const existingParticipant = createMockParticipant({
				season: seasonId,
				user: userId
			});

			mockGetOne.mockResolvedValue(mockSeason);
			mockGetFullList.mockResolvedValue([existingParticipant]);

			const result = await service.addParticipant(seasonId, userId);

			expect(mockCreate).not.toHaveBeenCalled();
			expect(result.participant).toEqual(existingParticipant);
		});

		it('should reject adding participant to non-filling season', async () => {
			const seasonId = 'season_test_123';
			const userId = 'user_new_456';

			const mockSeason = createMockSeason({
				id: seasonId,
				status: 'active' // Not filling
			});

			mockGetOne.mockResolvedValue(mockSeason);

			await expect(service.addParticipant(seasonId, userId)).rejects.toThrow(
				'Season is not accepting new participants'
			);

			expect(mockCreate).not.toHaveBeenCalled();
		});
	});

	describe('listSeasonsByOwner', () => {
		it('should return all seasons for a given owner', async () => {
			const ownerId = 'user_owner_123';

			const mockSeasons = [
				createMockSeason({ id: 'season_1', owner: ownerId, name: 'Season 1' }),
				createMockSeason({ id: 'season_2', owner: ownerId, name: 'Season 2' }),
				createMockSeason({ id: 'season_3', owner: ownerId, name: 'Season 3' })
			];

			mockGetFullList.mockResolvedValue(mockSeasons);

			const result = await service.listSeasonsByOwner(ownerId);

			expect(mockGetFullList).toHaveBeenCalledWith({
				filter: `owner = "${ownerId}"`,
				sort: '-created'
			});
			expect(result).toHaveLength(3);
			expect(result[0].name).toBe('Season 1');
		});

		it('should return empty array if owner has no seasons', async () => {
			const ownerId = 'user_no_seasons';

			mockGetFullList.mockResolvedValue([]);

			const result = await service.listSeasonsByOwner(ownerId);

			expect(result).toEqual([]);
		});
	});
});
