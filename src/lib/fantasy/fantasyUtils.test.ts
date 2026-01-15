import { describe, it, expect } from 'vitest';
import {
	generateLeagueCode,
	generateLeagueTitle,
	hasMinimumParticipants,
	filterParticipantsByStatus,
	getApprovedParticipants,
	getPendingParticipants,
	isLeagueOwner,
	getUserParticipation,
	canUserJoinLeague,
	calculateTotalPoints,
	rankParticipantsByPoints,
	validateFantasySettings,
	DEFAULT_FANTASY_SETTINGS,
	type FantasyParticipant
} from './fantasyUtils';

// Test fixtures
const createParticipant = (
	overrides: Partial<FantasyParticipant> = {}
): FantasyParticipant => ({
	id: 'participant_123',
	user: 'user_123',
	league: 'league_123',
	status: 'approved',
	is_owner: false,
	joined_at: new Date().toISOString(),
	total_points: 0,
	...overrides
});

describe('Fantasy Utilities', () => {
	describe('generateLeagueCode', () => {
		it('should return last 4 characters uppercase', () => {
			expect(generateLeagueCode('abc123xyz')).toBe('3XYZ');
			expect(generateLeagueCode('league_abcd1234')).toBe('1234');
		});

		it('should handle short IDs', () => {
			expect(generateLeagueCode('ab')).toBe('AB');
			expect(generateLeagueCode('a')).toBe('A');
		});

		it('should convert to uppercase', () => {
			expect(generateLeagueCode('abcdefgh')).toBe('EFGH');
		});
	});

	describe('generateLeagueTitle', () => {
		it('should format title with username and code', () => {
			expect(generateLeagueTitle('John', 'league_abc1234')).toBe("John's League - 1234");
			expect(generateLeagueTitle('Alice', 'xyz_efgh5678')).toBe("Alice's League - 5678");
		});

		it('should handle special characters in username', () => {
			expect(generateLeagueTitle("O'Brien", 'league_1234')).toBe("O'Brien's League - 1234");
		});
	});

	describe('hasMinimumParticipants', () => {
		it('should return true when at or above minimum', () => {
			expect(hasMinimumParticipants(6, 6)).toBe(true);
			expect(hasMinimumParticipants(10, 6)).toBe(true);
		});

		it('should return false when below minimum', () => {
			expect(hasMinimumParticipants(5, 6)).toBe(false);
			expect(hasMinimumParticipants(0, 6)).toBe(false);
		});

		it('should use default minimum when not specified', () => {
			expect(hasMinimumParticipants(6)).toBe(true);
			expect(hasMinimumParticipants(5)).toBe(false);
		});
	});

	describe('filterParticipantsByStatus', () => {
		const participants: FantasyParticipant[] = [
			createParticipant({ id: '1', status: 'approved' }),
			createParticipant({ id: '2', status: 'pending' }),
			createParticipant({ id: '3', status: 'approved' }),
			createParticipant({ id: '4', status: 'rejected' }),
			createParticipant({ id: '5', status: 'pending' })
		];

		it('should filter by approved status', () => {
			const result = filterParticipantsByStatus(participants, 'approved');
			expect(result).toHaveLength(2);
			expect(result.every((p) => p.status === 'approved')).toBe(true);
		});

		it('should filter by pending status', () => {
			const result = filterParticipantsByStatus(participants, 'pending');
			expect(result).toHaveLength(2);
			expect(result.every((p) => p.status === 'pending')).toBe(true);
		});

		it('should filter by rejected status', () => {
			const result = filterParticipantsByStatus(participants, 'rejected');
			expect(result).toHaveLength(1);
			expect(result[0].status).toBe('rejected');
		});

		it('should return empty array when no matches', () => {
			const allApproved = [
				createParticipant({ status: 'approved' }),
				createParticipant({ status: 'approved' })
			];
			expect(filterParticipantsByStatus(allApproved, 'rejected')).toHaveLength(0);
		});
	});

	describe('getApprovedParticipants', () => {
		it('should return only approved participants', () => {
			const participants = [
				createParticipant({ id: '1', status: 'approved' }),
				createParticipant({ id: '2', status: 'pending' }),
				createParticipant({ id: '3', status: 'approved' })
			];
			const result = getApprovedParticipants(participants);
			expect(result).toHaveLength(2);
		});
	});

	describe('getPendingParticipants', () => {
		it('should return only pending participants', () => {
			const participants = [
				createParticipant({ id: '1', status: 'approved' }),
				createParticipant({ id: '2', status: 'pending' }),
				createParticipant({ id: '3', status: 'pending' })
			];
			const result = getPendingParticipants(participants);
			expect(result).toHaveLength(2);
		});
	});

	describe('isLeagueOwner', () => {
		it('should return true for owner', () => {
			const participants = [
				createParticipant({ user: 'owner_123', is_owner: true }),
				createParticipant({ user: 'member_456', is_owner: false })
			];
			expect(isLeagueOwner(participants, 'owner_123')).toBe(true);
		});

		it('should return false for non-owner', () => {
			const participants = [
				createParticipant({ user: 'owner_123', is_owner: true }),
				createParticipant({ user: 'member_456', is_owner: false })
			];
			expect(isLeagueOwner(participants, 'member_456')).toBe(false);
		});

		it('should return false for non-participant', () => {
			const participants = [createParticipant({ user: 'owner_123', is_owner: true })];
			expect(isLeagueOwner(participants, 'unknown_user')).toBe(false);
		});
	});

	describe('getUserParticipation', () => {
		const participants = [
			createParticipant({ id: '1', user: 'user_a', status: 'approved' }),
			createParticipant({ id: '2', user: 'user_b', status: 'pending' })
		];

		it('should return participant record for existing user', () => {
			const result = getUserParticipation(participants, 'user_a');
			expect(result).not.toBeNull();
			expect(result?.id).toBe('1');
			expect(result?.status).toBe('approved');
		});

		it('should return null for non-participant', () => {
			expect(getUserParticipation(participants, 'unknown_user')).toBeNull();
		});
	});

	describe('canUserJoinLeague', () => {
		it('should return true for new user', () => {
			const participants = [createParticipant({ user: 'existing_user' })];
			expect(canUserJoinLeague(participants, 'new_user')).toBe(true);
		});

		it('should return false for approved user', () => {
			const participants = [createParticipant({ user: 'user_123', status: 'approved' })];
			expect(canUserJoinLeague(participants, 'user_123')).toBe(false);
		});

		it('should return false for pending user', () => {
			const participants = [createParticipant({ user: 'user_123', status: 'pending' })];
			expect(canUserJoinLeague(participants, 'user_123')).toBe(false);
		});

		it('should return true for previously rejected user', () => {
			const participants = [createParticipant({ user: 'user_123', status: 'rejected' })];
			expect(canUserJoinLeague(participants, 'user_123')).toBe(true);
		});
	});

	describe('calculateTotalPoints', () => {
		it('should sum all tournament points', () => {
			expect(calculateTotalPoints([10, 20, 30])).toBe(60);
			expect(calculateTotalPoints([100, 50, 75, 25])).toBe(250);
		});

		it('should return 0 for empty array', () => {
			expect(calculateTotalPoints([])).toBe(0);
		});

		it('should handle negative points', () => {
			expect(calculateTotalPoints([10, -5, 20])).toBe(25);
		});
	});

	describe('rankParticipantsByPoints', () => {
		it('should rank participants by points descending', () => {
			const participants = [
				{ id: 'a', total_points: 50 },
				{ id: 'b', total_points: 100 },
				{ id: 'c', total_points: 75 }
			];
			const result = rankParticipantsByPoints(participants);

			expect(result[0].id).toBe('b');
			expect(result[0].rank).toBe(1);
			expect(result[1].id).toBe('c');
			expect(result[1].rank).toBe(2);
			expect(result[2].id).toBe('a');
			expect(result[2].rank).toBe(3);
		});

		it('should handle ties correctly', () => {
			const participants = [
				{ id: 'a', total_points: 100 },
				{ id: 'b', total_points: 100 },
				{ id: 'c', total_points: 50 }
			];
			const result = rankParticipantsByPoints(participants);

			// Both a and b should be rank 1
			expect(result[0].rank).toBe(1);
			expect(result[1].rank).toBe(1);
			// c should be rank 3 (not 2)
			expect(result[2].rank).toBe(3);
		});

		it('should handle undefined total_points as 0', () => {
			const participants = [
				{ id: 'a', total_points: 50 },
				{ id: 'b' }, // no total_points
				{ id: 'c', total_points: 25 }
			];
			const result = rankParticipantsByPoints(participants);

			expect(result[0].id).toBe('a');
			expect(result[1].id).toBe('c');
			expect(result[2].id).toBe('b');
			expect(result[2].rank).toBe(3);
		});

		it('should handle empty array', () => {
			expect(rankParticipantsByPoints([])).toEqual([]);
		});
	});

	describe('validateFantasySettings', () => {
		it('should accept valid settings', () => {
			const result = validateFantasySettings({
				start_pause_interval: 60,
				rounds: 5,
				min_participants: 6
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject invalid pick interval', () => {
			expect(validateFantasySettings({ start_pause_interval: 20 }).valid).toBe(false);
			expect(validateFantasySettings({ start_pause_interval: 400 }).valid).toBe(false);
		});

		it('should accept boundary values for pick interval', () => {
			expect(validateFantasySettings({ start_pause_interval: 30 }).valid).toBe(true);
			expect(validateFantasySettings({ start_pause_interval: 300 }).valid).toBe(true);
		});

		it('should reject invalid rounds', () => {
			expect(validateFantasySettings({ rounds: 0 }).valid).toBe(false);
			expect(validateFantasySettings({ rounds: 11 }).valid).toBe(false);
		});

		it('should accept boundary values for rounds', () => {
			expect(validateFantasySettings({ rounds: 1 }).valid).toBe(true);
			expect(validateFantasySettings({ rounds: 10 }).valid).toBe(true);
		});

		it('should reject invalid min_participants', () => {
			expect(validateFantasySettings({ min_participants: 1 }).valid).toBe(false);
			expect(validateFantasySettings({ min_participants: 101 }).valid).toBe(false);
		});

		it('should accept boundary values for min_participants', () => {
			expect(validateFantasySettings({ min_participants: 2 }).valid).toBe(true);
			expect(validateFantasySettings({ min_participants: 100 }).valid).toBe(true);
		});

		it('should collect multiple errors', () => {
			const result = validateFantasySettings({
				start_pause_interval: 10,
				rounds: 0,
				min_participants: 1
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(3);
		});

		it('should accept empty settings (all optional)', () => {
			const result = validateFantasySettings({});
			expect(result.valid).toBe(true);
		});
	});

	describe('DEFAULT_FANTASY_SETTINGS', () => {
		it('should have correct default values', () => {
			expect(DEFAULT_FANTASY_SETTINGS.start_pause_interval).toBe(60);
			expect(DEFAULT_FANTASY_SETTINGS.rounds).toBe(5);
			expect(DEFAULT_FANTASY_SETTINGS.check_gender).toBe(false);
			expect(DEFAULT_FANTASY_SETTINGS.min_participants).toBe(6);
			expect(DEFAULT_FANTASY_SETTINGS.auto_generate_tournaments).toBe(true);
		});
	});
});
