import { describe, it, expect } from 'vitest';
import {
	shuffleArray,
	getDraftDirection,
	getDrafterIndex,
	getNextDrafter,
	calculateTotalPicks,
	isDraftComplete,
	getAvailableGolfers,
	filterGolfersByGender,
	getRecommendedPick,
	processDraftPick,
	createInitialTeamComposition,
	createInitialDraftState,
	validateDraftPick,
	formatPickNumber,
	calculateOverallPick,
	type DraftGolfer,
	type TeamComposition,
	type DraftState
} from './draftUtils';

// Test fixtures
const createGolfer = (overrides: Partial<DraftGolfer> = {}): DraftGolfer => ({
	id: 'golfer_123',
	name: 'Test Golfer',
	team: 'Team A',
	gender: 'male',
	drafted: false,
	drafted_by: null,
	...overrides
});

const createTeamComposition = (overrides: Partial<TeamComposition> = {}): TeamComposition => ({
	male_count: 0,
	female_count: 0,
	total_picks: 0,
	fantasy_team: [],
	...overrides
});

describe('Draft Utilities', () => {
	describe('shuffleArray', () => {
		it('should return array of same length', () => {
			const arr = [1, 2, 3, 4, 5];
			const shuffled = shuffleArray(arr);
			expect(shuffled).toHaveLength(arr.length);
		});

		it('should contain all original elements', () => {
			const arr = [1, 2, 3, 4, 5];
			const shuffled = shuffleArray(arr);
			arr.forEach((item) => {
				expect(shuffled).toContain(item);
			});
		});

		it('should not modify original array', () => {
			const arr = [1, 2, 3, 4, 5];
			const original = [...arr];
			shuffleArray(arr);
			expect(arr).toEqual(original);
		});

		it('should handle empty array', () => {
			expect(shuffleArray([])).toEqual([]);
		});

		it('should handle single element', () => {
			expect(shuffleArray([1])).toEqual([1]);
		});
	});

	describe('getDraftDirection', () => {
		it('should return "down" for odd rounds', () => {
			expect(getDraftDirection(1)).toBe('down');
			expect(getDraftDirection(3)).toBe('down');
			expect(getDraftDirection(5)).toBe('down');
		});

		it('should return "up" for even rounds', () => {
			expect(getDraftDirection(2)).toBe('up');
			expect(getDraftDirection(4)).toBe('up');
			expect(getDraftDirection(6)).toBe('up');
		});
	});

	describe('getDrafterIndex', () => {
		it('should return sequential index for "down" direction', () => {
			const total = 4;
			expect(getDrafterIndex(0, total, 'down')).toBe(0);
			expect(getDrafterIndex(1, total, 'down')).toBe(1);
			expect(getDrafterIndex(2, total, 'down')).toBe(2);
			expect(getDrafterIndex(3, total, 'down')).toBe(3);
		});

		it('should return reverse index for "up" direction', () => {
			const total = 4;
			expect(getDrafterIndex(0, total, 'up')).toBe(3);
			expect(getDrafterIndex(1, total, 'up')).toBe(2);
			expect(getDrafterIndex(2, total, 'up')).toBe(1);
			expect(getDrafterIndex(3, total, 'up')).toBe(0);
		});

		it('should wrap around correctly', () => {
			const total = 3;
			expect(getDrafterIndex(4, total, 'down')).toBe(1); // 4 % 3 = 1
			expect(getDrafterIndex(5, total, 'down')).toBe(2); // 5 % 3 = 2
		});
	});

	describe('getNextDrafter', () => {
		const draftOrder = ['user_a', 'user_b', 'user_c', 'user_d'];

		it('should return next drafter in round 1 (down)', () => {
			const result = getNextDrafter(draftOrder, 0, 1);
			expect(result.nextDrafter).toBe('user_b');
			expect(result.nextPick).toBe(1);
			expect(result.nextRound).toBe(1);
			expect(result.direction).toBe('down');
		});

		it('should transition to round 2 (up) after round 1 completes', () => {
			const result = getNextDrafter(draftOrder, 3, 1);
			expect(result.nextDrafter).toBe('user_d'); // Last person picks first in reverse
			expect(result.nextPick).toBe(0);
			expect(result.nextRound).toBe(2);
			expect(result.direction).toBe('up');
		});

		it('should go in reverse order during round 2', () => {
			// Round 2, pick 0 -> user_d (index 3)
			let result = getNextDrafter(draftOrder, 0, 2);
			expect(result.nextDrafter).toBe('user_c'); // Next is index 2
			expect(result.direction).toBe('up');

			// Round 2, pick 1 -> user_c (index 2)
			result = getNextDrafter(draftOrder, 1, 2);
			expect(result.nextDrafter).toBe('user_b'); // Next is index 1
		});

		it('should transition back to down for round 3', () => {
			const result = getNextDrafter(draftOrder, 3, 2);
			expect(result.nextRound).toBe(3);
			expect(result.direction).toBe('down');
			expect(result.nextDrafter).toBe('user_a');
		});

		it('should handle 2-person draft', () => {
			const twoPersonOrder = ['user_a', 'user_b'];

			// Round 1: a, b
			let result = getNextDrafter(twoPersonOrder, 0, 1);
			expect(result.nextDrafter).toBe('user_b');

			// End of round 1 -> round 2: b, a
			result = getNextDrafter(twoPersonOrder, 1, 1);
			expect(result.nextRound).toBe(2);
			expect(result.nextDrafter).toBe('user_b'); // b picks first in round 2

			result = getNextDrafter(twoPersonOrder, 0, 2);
			expect(result.nextDrafter).toBe('user_a');
		});
	});

	describe('calculateTotalPicks', () => {
		it('should calculate total picks correctly', () => {
			expect(calculateTotalPicks(6, 5)).toBe(30);
			expect(calculateTotalPicks(4, 4)).toBe(16);
			expect(calculateTotalPicks(10, 3)).toBe(30);
		});
	});

	describe('isDraftComplete', () => {
		it('should return true when current pick equals total', () => {
			expect(isDraftComplete(30, 30)).toBe(true);
		});

		it('should return true when current pick exceeds total', () => {
			expect(isDraftComplete(31, 30)).toBe(true);
		});

		it('should return false when picks remain', () => {
			expect(isDraftComplete(29, 30)).toBe(false);
			expect(isDraftComplete(0, 30)).toBe(false);
		});
	});

	describe('getAvailableGolfers', () => {
		it('should return only undrafted golfers', () => {
			const golfers = [
				createGolfer({ id: '1', drafted: false }),
				createGolfer({ id: '2', drafted: true }),
				createGolfer({ id: '3', drafted: false })
			];
			const available = getAvailableGolfers(golfers);
			expect(available).toHaveLength(2);
			expect(available.map((g) => g.id)).toEqual(['1', '3']);
		});

		it('should return empty array when all drafted', () => {
			const golfers = [
				createGolfer({ id: '1', drafted: true }),
				createGolfer({ id: '2', drafted: true })
			];
			expect(getAvailableGolfers(golfers)).toHaveLength(0);
		});
	});

	describe('filterGolfersByGender', () => {
		const golfers = [
			createGolfer({ id: '1', gender: 'male' }),
			createGolfer({ id: '2', gender: 'female' }),
			createGolfer({ id: '3', gender: 'male' }),
			createGolfer({ id: '4', gender: 'female' })
		];

		it('should filter male golfers', () => {
			const males = filterGolfersByGender(golfers, 'male');
			expect(males).toHaveLength(2);
			expect(males.every((g) => g.gender === 'male')).toBe(true);
		});

		it('should filter female golfers', () => {
			const females = filterGolfersByGender(golfers, 'female');
			expect(females).toHaveLength(2);
			expect(females.every((g) => g.gender === 'female')).toBe(true);
		});
	});

	describe('getRecommendedPick', () => {
		const golfers = [
			createGolfer({ id: '1', name: 'Male 1', gender: 'male' }),
			createGolfer({ id: '2', name: 'Female 1', gender: 'female' }),
			createGolfer({ id: '3', name: 'Male 2', gender: 'male' }),
			createGolfer({ id: '4', name: 'Female 2', gender: 'female' })
		];

		it('should return first available golfer in early rounds', () => {
			const teamComp = createTeamComposition();
			const result = getRecommendedPick(golfers, teamComp, 1, 5);

			expect(result.recommendedGolfer?.id).toBe('1');
			expect(result.filteredGolfers).toHaveLength(4);
		});

		it('should filter to females when males are maxed (round 3+)', () => {
			const teamComp = createTeamComposition({
				male_count: 3,
				female_count: 0,
				total_picks: 3
			});
			const result = getRecommendedPick(golfers, teamComp, 3, 5);

			// With 5 rounds and 3 males already, need females
			expect(result.filteredGolfers.every((g) => g.gender === 'female')).toBe(true);
			expect(result.recommendedGolfer?.gender).toBe('female');
		});

		it('should filter to males when females are maxed (round 3+)', () => {
			const teamComp = createTeamComposition({
				male_count: 0,
				female_count: 3,
				total_picks: 3
			});
			const result = getRecommendedPick(golfers, teamComp, 3, 5);

			expect(result.filteredGolfers.every((g) => g.gender === 'male')).toBe(true);
			expect(result.recommendedGolfer?.gender).toBe('male');
		});

		it('should not filter in round 2', () => {
			const teamComp = createTeamComposition({
				male_count: 2,
				female_count: 0,
				total_picks: 2
			});
			const result = getRecommendedPick(golfers, teamComp, 2, 5);

			expect(result.filteredGolfers).toHaveLength(4);
		});

		it('should return null when no golfers available', () => {
			const draftedGolfers = golfers.map((g) => ({ ...g, drafted: true }));
			const result = getRecommendedPick(draftedGolfers, createTeamComposition(), 1, 5);

			expect(result.recommendedGolfer).toBeNull();
			expect(result.filteredGolfers).toHaveLength(0);
		});
	});

	describe('processDraftPick', () => {
		it('should update team composition for male golfer', () => {
			const golfer = createGolfer({ id: '1', gender: 'male' });
			const teamComp = createTeamComposition();

			const result = processDraftPick(golfer, 'user_123', teamComp);

			expect(result.male_count).toBe(1);
			expect(result.female_count).toBe(0);
			expect(result.total_picks).toBe(1);
			expect(result.fantasy_team).toHaveLength(1);
			expect(result.fantasy_team[0].drafted).toBe(true);
			expect(result.fantasy_team[0].drafted_by).toBe('user_123');
		});

		it('should update team composition for female golfer', () => {
			const golfer = createGolfer({ id: '1', gender: 'female' });
			const teamComp = createTeamComposition();

			const result = processDraftPick(golfer, 'user_123', teamComp);

			expect(result.male_count).toBe(0);
			expect(result.female_count).toBe(1);
			expect(result.total_picks).toBe(1);
		});

		it('should accumulate picks correctly', () => {
			const golfer1 = createGolfer({ id: '1', gender: 'male' });
			const golfer2 = createGolfer({ id: '2', gender: 'female' });

			let teamComp = createTeamComposition();
			teamComp = processDraftPick(golfer1, 'user_123', teamComp);
			teamComp = processDraftPick(golfer2, 'user_123', teamComp);

			expect(teamComp.male_count).toBe(1);
			expect(teamComp.female_count).toBe(1);
			expect(teamComp.total_picks).toBe(2);
			expect(teamComp.fantasy_team).toHaveLength(2);
		});
	});

	describe('createInitialTeamComposition', () => {
		it('should create empty team composition', () => {
			const comp = createInitialTeamComposition();

			expect(comp.male_count).toBe(0);
			expect(comp.female_count).toBe(0);
			expect(comp.total_picks).toBe(0);
			expect(comp.fantasy_team).toEqual([]);
		});
	});

	describe('createInitialDraftState', () => {
		it('should create initial state with correct structure', () => {
			const draftOrder = ['user_a', 'user_b', 'user_c'];
			const golfers = [
				createGolfer({ id: '1' }),
				createGolfer({ id: '2' })
			];

			const state = createInitialDraftState(draftOrder, golfers);

			expect(state.current_pick).toBe(0);
			expect(state.current_round).toBe(1);
			expect(state.current_drafter).toBe('user_a');
			expect(state.draft_direction).toBe('down');
			expect(state.draft_started).toBe(false);
			expect(state.draft_completed).toBe(false);
			expect(state.available_golfers).toHaveLength(2);
			expect(Object.keys(state.team_compositions)).toHaveLength(3);
		});

		it('should initialize team compositions for all participants', () => {
			const draftOrder = ['user_a', 'user_b'];
			const state = createInitialDraftState(draftOrder, []);

			expect(state.team_compositions['user_a']).toBeDefined();
			expect(state.team_compositions['user_b']).toBeDefined();
			expect(state.team_compositions['user_a'].total_picks).toBe(0);
		});

		it('should reset golfer drafted status', () => {
			const golfers = [createGolfer({ id: '1', drafted: true, drafted_by: 'someone' })];
			const state = createInitialDraftState(['user_a'], golfers);

			expect(state.available_golfers[0].drafted).toBe(false);
			expect(state.available_golfers[0].drafted_by).toBeNull();
		});
	});

	describe('validateDraftPick', () => {
		const createDraftState = (overrides: Partial<DraftState> = {}): DraftState => ({
			available_golfers: [createGolfer({ id: 'golfer_1' })],
			current_pick: 0,
			current_round: 1,
			current_drafter: 'user_a',
			draft_direction: 'down',
			draft_started: true,
			draft_completed: false,
			team_compositions: {},
			...overrides
		});

		it('should validate successful pick', () => {
			const state = createDraftState();
			const result = validateDraftPick(state, 'user_a', 'golfer_1');

			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should reject if draft completed', () => {
			const state = createDraftState({ draft_completed: true });
			const result = validateDraftPick(state, 'user_a', 'golfer_1');

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Draft is already completed');
		});

		it('should reject if draft not started', () => {
			const state = createDraftState({ draft_started: false });
			const result = validateDraftPick(state, 'user_a', 'golfer_1');

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Draft has not started yet');
		});

		it('should reject if not user turn', () => {
			const state = createDraftState({ current_drafter: 'user_b' });
			const result = validateDraftPick(state, 'user_a', 'golfer_1');

			expect(result.valid).toBe(false);
			expect(result.error).toBe('It is not your turn to pick');
		});

		it('should reject if golfer not found', () => {
			const state = createDraftState();
			const result = validateDraftPick(state, 'user_a', 'unknown_golfer');

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Golfer not found');
		});

		it('should reject if golfer already drafted', () => {
			const state = createDraftState({
				available_golfers: [createGolfer({ id: 'golfer_1', drafted: true })]
			});
			const result = validateDraftPick(state, 'user_a', 'golfer_1');

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Golfer has already been drafted');
		});
	});

	describe('formatPickNumber', () => {
		it('should format pick number correctly', () => {
			expect(formatPickNumber(1, 0)).toBe('Round 1, Pick 1');
			expect(formatPickNumber(2, 3)).toBe('Round 2, Pick 4');
			expect(formatPickNumber(5, 5)).toBe('Round 5, Pick 6');
		});
	});

	describe('calculateOverallPick', () => {
		it('should calculate overall pick number', () => {
			// 4 participants per round
			expect(calculateOverallPick(1, 0, 4)).toBe(1); // First pick
			expect(calculateOverallPick(1, 3, 4)).toBe(4); // Last pick of round 1
			expect(calculateOverallPick(2, 0, 4)).toBe(5); // First pick of round 2
			expect(calculateOverallPick(3, 2, 4)).toBe(11); // Third pick of round 3
		});
	});

	describe('Snake Draft Integration', () => {
		it('should correctly simulate a full 4-person, 3-round snake draft', () => {
			const draftOrder = ['A', 'B', 'C', 'D'];
			const expectedOrder = [
				// Round 1 (down): A, B, C, D
				'A',
				'B',
				'C',
				'D',
				// Round 2 (up): D, C, B, A
				'D',
				'C',
				'B',
				'A',
				// Round 3 (down): A, B, C, D
				'A',
				'B',
				'C',
				'D'
			];

			const actualOrder: string[] = [];
			let currentPick = 0;
			let currentRound = 1;

			// First pick
			const direction = getDraftDirection(currentRound);
			const firstIndex = getDrafterIndex(currentPick, 4, direction);
			actualOrder.push(draftOrder[firstIndex]);

			// Remaining picks
			for (let i = 1; i < 12; i++) {
				const result = getNextDrafter(draftOrder, currentPick, currentRound);
				actualOrder.push(result.nextDrafter);
				currentPick = result.nextPick;
				currentRound = result.nextRound;
			}

			expect(actualOrder).toEqual(expectedOrder);
		});
	});
});
