import { describe, it, expect, beforeEach } from 'vitest';
import {
	getEffectiveRanking,
	sortGolfersByRanking,
	getBestRankedPick,
	executeAutoPick,
	isValidTimerDuration,
	DEFAULT_RANKING,
	TIMER_OPTIONS,
	type DraftGolfer,
	type DraftState,
	type TeamComposition
} from './draftUtils';
import {
	mockParticipants,
	mockMaleGolfers,
	mockFemaleGolfers,
	createMockGolfers,
	createInitialDraftState,
	createTeamWith2Males,
	createTeamWith2Females,
	createTeamWith1Each
} from '../../test/fixtures/draft';

describe('Draft Recommendation & Auto-Pick', () => {
	describe('getEffectiveRanking', () => {
		it('should return ranking when defined', () => {
			const golfer: DraftGolfer = {
				id: '1',
				name: 'Test',
				gender: 'male',
				drafted: false,
				drafted_by: null,
				ranking: 5
			};
			expect(getEffectiveRanking(golfer)).toBe(5);
		});

		it('should return DEFAULT_RANKING (999) when ranking is undefined', () => {
			const golfer: DraftGolfer = {
				id: '1',
				name: 'Test',
				gender: 'male',
				drafted: false,
				drafted_by: null
			};
			expect(getEffectiveRanking(golfer)).toBe(DEFAULT_RANKING);
			expect(getEffectiveRanking(golfer)).toBe(999);
		});

		it('should return DEFAULT_RANKING (999) when ranking is null', () => {
			const golfer: DraftGolfer = {
				id: '1',
				name: 'Test',
				gender: 'male',
				drafted: false,
				drafted_by: null,
				ranking: null
			};
			expect(getEffectiveRanking(golfer)).toBe(DEFAULT_RANKING);
		});

		it('should handle ranking of 0', () => {
			const golfer: DraftGolfer = {
				id: '1',
				name: 'Test',
				gender: 'male',
				drafted: false,
				drafted_by: null,
				ranking: 0
			};
			// 0 is falsy but should still be used as ranking
			expect(getEffectiveRanking(golfer)).toBe(0);
		});
	});

	describe('sortGolfersByRanking', () => {
		it('should sort golfers by ranking (best first)', () => {
			const golfers: DraftGolfer[] = [
				{ id: '3', name: 'Third', gender: 'male', drafted: false, drafted_by: null, ranking: 10 },
				{ id: '1', name: 'First', gender: 'male', drafted: false, drafted_by: null, ranking: 1 },
				{ id: '2', name: 'Second', gender: 'male', drafted: false, drafted_by: null, ranking: 5 }
			];

			const sorted = sortGolfersByRanking(golfers);

			expect(sorted[0].id).toBe('1');
			expect(sorted[0].ranking).toBe(1);
			expect(sorted[1].id).toBe('2');
			expect(sorted[1].ranking).toBe(5);
			expect(sorted[2].id).toBe('3');
			expect(sorted[2].ranking).toBe(10);
		});

		it('should not mutate original array', () => {
			const golfers: DraftGolfer[] = [
				{ id: '2', name: 'Second', gender: 'male', drafted: false, drafted_by: null, ranking: 5 },
				{ id: '1', name: 'First', gender: 'male', drafted: false, drafted_by: null, ranking: 1 }
			];

			const sorted = sortGolfersByRanking(golfers);

			expect(golfers[0].id).toBe('2'); // Original unchanged
			expect(sorted[0].id).toBe('1'); // Sorted is different
		});

		it('should put undefined/null rankings at the end', () => {
			const golfers: DraftGolfer[] = [
				{ id: 'unranked', name: 'Unranked', gender: 'male', drafted: false, drafted_by: null },
				{ id: 'ranked', name: 'Ranked', gender: 'male', drafted: false, drafted_by: null, ranking: 5 },
				{ id: 'null_ranked', name: 'Null', gender: 'male', drafted: false, drafted_by: null, ranking: null }
			];

			const sorted = sortGolfersByRanking(golfers);

			expect(sorted[0].id).toBe('ranked');
			// Unranked and null should be at the end (both have effective ranking 999)
			expect(sorted[1].ranking ?? DEFAULT_RANKING).toBe(DEFAULT_RANKING);
			expect(sorted[2].ranking ?? DEFAULT_RANKING).toBe(DEFAULT_RANKING);
		});

		it('should handle empty array', () => {
			expect(sortGolfersByRanking([])).toEqual([]);
		});

		it('should handle single golfer', () => {
			const golfers: DraftGolfer[] = [
				{ id: '1', name: 'Only', gender: 'male', drafted: false, drafted_by: null, ranking: 1 }
			];
			const sorted = sortGolfersByRanking(golfers);
			expect(sorted).toHaveLength(1);
			expect(sorted[0].id).toBe('1');
		});

		it('should maintain stable order for equal rankings', () => {
			const golfers: DraftGolfer[] = [
				{ id: 'a', name: 'A', gender: 'male', drafted: false, drafted_by: null, ranking: 5 },
				{ id: 'b', name: 'B', gender: 'male', drafted: false, drafted_by: null, ranking: 5 },
				{ id: 'c', name: 'C', gender: 'male', drafted: false, drafted_by: null, ranking: 5 }
			];

			const sorted = sortGolfersByRanking(golfers);

			// All have same ranking, order should be preserved
			expect(sorted.map(g => g.id)).toEqual(['a', 'b', 'c']);
		});
	});

	describe('getBestRankedPick', () => {
		it('should return best ranked male golfer in round 1', () => {
			const golfers = createMockGolfers();
			const teamComp: TeamComposition = {
				male_count: 0,
				female_count: 0,
				total_picks: 0,
				fantasy_team: []
			};

			const best = getBestRankedPick(golfers, teamComp, 1, 4);

			// Tiger Woods is ranked #1 among males
			expect(best).not.toBeNull();
			expect(best?.id).toBe('male_01');
			expect(best?.name).toBe('Tiger Woods');
			expect(best?.ranking).toBe(1);
		});

		it('should return best ranked available golfer when top is drafted', () => {
			const golfers = createMockGolfers();
			// Mark Tiger Woods (male rank 1) and Nelly Korda (female rank 1) as drafted
			golfers.find(g => g.id === 'male_01')!.drafted = true;
			golfers.find(g => g.id === 'female_01')!.drafted = true;

			const teamComp: TeamComposition = {
				male_count: 0,
				female_count: 0,
				total_picks: 0,
				fantasy_team: []
			};

			const best = getBestRankedPick(golfers, teamComp, 1, 4);

			// Best available is now rank 2 (either Rory McIlroy or Lydia Ko)
			expect(best?.ranking).toBe(2);
			expect(best?.drafted).toBe(false);
		});

		it('should return best ranked female in round 3 when participant has 2 males', () => {
			const golfers = createMockGolfers();
			const teamComp = createTeamWith2Males();

			const best = getBestRankedPick(golfers, teamComp, 3, 4);

			// Should be Nelly Korda (ranked #1 female)
			expect(best).not.toBeNull();
			expect(best?.gender).toBe('female');
			expect(best?.id).toBe('female_01');
			expect(best?.name).toBe('Nelly Korda');
			expect(best?.ranking).toBe(1);
		});

		it('should return best ranked male in round 3 when participant has 2 females', () => {
			const golfers = createMockGolfers();
			const teamComp = createTeamWith2Females();

			const best = getBestRankedPick(golfers, teamComp, 3, 4);

			// Should be Tiger Woods (ranked #1 male)
			expect(best).not.toBeNull();
			expect(best?.gender).toBe('male');
			expect(best?.id).toBe('male_01');
			expect(best?.ranking).toBe(1);
		});

		it('should return best ranked from either gender in round 3 when balanced', () => {
			const golfers = createMockGolfers();
			const teamComp = createTeamWith1Each();

			const best = getBestRankedPick(golfers, teamComp, 3, 4);

			// Both genders available, should pick best overall
			// Tiger Woods (male, rank 1) and Nelly Korda (female, rank 1) both rank 1
			// Should return first one found after sorting
			expect(best).not.toBeNull();
			expect(best?.ranking).toBe(1);
		});

		it('should return null when no golfers available', () => {
			const golfers = createMockGolfers();
			// Mark all as drafted
			golfers.forEach(g => {
				g.drafted = true;
			});

			const teamComp: TeamComposition = {
				male_count: 0,
				female_count: 0,
				total_picks: 0,
				fantasy_team: []
			};

			const best = getBestRankedPick(golfers, teamComp, 1, 4);

			expect(best).toBeNull();
		});

		it('should skip drafted golfers even if they have best ranking', () => {
			const golfers = createMockGolfers();
			// Draft top 3 males
			golfers.find(g => g.id === 'male_01')!.drafted = true;
			golfers.find(g => g.id === 'male_02')!.drafted = true;
			golfers.find(g => g.id === 'male_03')!.drafted = true;

			const teamComp: TeamComposition = {
				male_count: 0,
				female_count: 0,
				total_picks: 0,
				fantasy_team: []
			};

			const best = getBestRankedPick(golfers, teamComp, 1, 4);

			// Should be Scottie Scheffler (ranked #4 male) or Nelly Korda (ranked #1 female)
			expect(best).not.toBeNull();
			expect(best?.drafted).toBe(false);
			// Nelly Korda has rank 1, Scottie has rank 4, so Nelly should be picked
			expect(best?.id).toBe('female_01');
		});
	});

	describe('Timer Options', () => {
		it('should have correct timer options', () => {
			expect(TIMER_OPTIONS).toEqual([7, 15, 30, 45]);
		});

		it('should validate correct timer durations', () => {
			expect(isValidTimerDuration(7)).toBe(true);
			expect(isValidTimerDuration(15)).toBe(true);
			expect(isValidTimerDuration(30)).toBe(true);
			expect(isValidTimerDuration(45)).toBe(true);
		});

		it('should reject invalid timer durations', () => {
			expect(isValidTimerDuration(10)).toBe(false);
			expect(isValidTimerDuration(60)).toBe(false);
			expect(isValidTimerDuration(0)).toBe(false);
			expect(isValidTimerDuration(-1)).toBe(false);
		});
	});

	describe('executeAutoPick', () => {
		let draftState: DraftState;

		beforeEach(() => {
			draftState = createInitialDraftState();
		});

		it('should auto-pick best ranked golfer for current drafter', () => {
			const result = executeAutoPick(draftState, 'user_alice');

			expect(result).not.toBeNull();
			expect(result?.wasAutoPick).toBe(true);
			expect(result?.golfer).toBeDefined();
			// Should pick Tiger Woods (best ranked male) or Nelly Korda (best ranked female)
			expect(result?.golfer.ranking).toBe(1);
		});

		it('should return null if not current drafter turn', () => {
			const result = executeAutoPick(draftState, 'user_bob');

			expect(result).toBeNull();
		});

		it('should return null if draft not started', () => {
			draftState.draft_started = false;

			const result = executeAutoPick(draftState, 'user_alice');

			expect(result).toBeNull();
		});

		it('should return null if draft completed', () => {
			draftState.draft_completed = true;

			const result = executeAutoPick(draftState, 'user_alice');

			expect(result).toBeNull();
		});

		it('should respect gender filter in round 3 for auto-pick', () => {
			// Set up state for round 3 with Alice having 2 males
			draftState.current_round = 3;
			draftState.current_pick = 0;
			draftState.current_drafter = 'user_alice';
			draftState.team_compositions['user_alice'] = createTeamWith2Males();

			const result = executeAutoPick(draftState, 'user_alice');

			expect(result).not.toBeNull();
			expect(result?.golfer.gender).toBe('female');
			// Should be Nelly Korda (best ranked female)
			expect(result?.golfer.id).toBe('female_01');
		});

		it('should pick best available when top golfers are drafted', () => {
			// Draft top 5 males and top 5 females
			for (let i = 0; i < 5; i++) {
				draftState.available_golfers.find(g => g.id === `male_0${i + 1}`)!.drafted = true;
				draftState.available_golfers.find(g => g.id === `female_0${i + 1}`)!.drafted = true;
			}

			const result = executeAutoPick(draftState, 'user_alice');

			expect(result).not.toBeNull();
			// Best available should be rank 6 (either male_06 or female_06)
			expect(result?.golfer.ranking).toBe(6);
		});

		it('should return null if no golfers available', () => {
			// Draft all golfers
			draftState.available_golfers.forEach(g => {
				g.drafted = true;
			});

			const result = executeAutoPick(draftState, 'user_alice');

			expect(result).toBeNull();
		});
	});

	describe('Auto-Pick Integration Scenarios', () => {
		it('should auto-pick correctly through multiple rounds', () => {
			const draftState = createInitialDraftState();
			const autoPicks: string[] = [];

			// Simulate auto-picks for first 6 picks (round 1)
			for (let i = 0; i < 6; i++) {
				const drafter = draftState.current_drafter;
				const result = executeAutoPick(draftState, drafter);

				expect(result).not.toBeNull();
				autoPicks.push(result!.golfer.id);

				// Process the pick
				const golfer = draftState.available_golfers.find(g => g.id === result!.golfer.id)!;
				golfer.drafted = true;
				golfer.drafted_by = drafter;

				// Update team composition
				const teamComp = draftState.team_compositions[drafter];
				if (golfer.gender === 'male') {
					teamComp.male_count++;
				} else {
					teamComp.female_count++;
				}
				teamComp.total_picks++;
				teamComp.fantasy_team.push(golfer);

				// Move to next drafter (simplified)
				draftState.current_pick++;
				if (draftState.current_pick >= 6) {
					draftState.current_pick = 0;
					draftState.current_round++;
				}
				const nextDrafterIndex = draftState.current_round % 2 === 1
					? draftState.current_pick
					: 5 - draftState.current_pick;
				draftState.current_drafter = mockParticipants[nextDrafterIndex];
			}

			// All 6 picks should be unique
			expect(new Set(autoPicks).size).toBe(6);

			// All should be top ranked golfers
			autoPicks.forEach(id => {
				const golfer = mockMaleGolfers.find(g => g.id === id) || 
				               mockFemaleGolfers.find(g => g.id === id);
				expect(golfer?.ranking).toBeLessThanOrEqual(6);
			});
		});

		it('should enforce gender balance with auto-picks in rounds 3-4', () => {
			const draftState = createInitialDraftState();

			// Simulate: Alice picked 2 males in rounds 1-2
			draftState.team_compositions['user_alice'] = {
				male_count: 2,
				female_count: 0,
				total_picks: 2,
				fantasy_team: [
					{ ...mockMaleGolfers[0], drafted: true, drafted_by: 'user_alice' },
					{ ...mockMaleGolfers[1], drafted: true, drafted_by: 'user_alice' }
				]
			};
			draftState.available_golfers.find(g => g.id === 'male_01')!.drafted = true;
			draftState.available_golfers.find(g => g.id === 'male_02')!.drafted = true;

			// Set to round 3, Alice's turn
			draftState.current_round = 3;
			draftState.current_pick = 0;
			draftState.current_drafter = 'user_alice';

			// Auto-pick should be female
			const pick3 = executeAutoPick(draftState, 'user_alice');
			expect(pick3?.golfer.gender).toBe('female');

			// Process pick 3
			const golfer3 = draftState.available_golfers.find(g => g.id === pick3!.golfer.id)!;
			golfer3.drafted = true;
			draftState.team_compositions['user_alice'].female_count++;
			draftState.team_compositions['user_alice'].total_picks++;
			draftState.team_compositions['user_alice'].fantasy_team.push(golfer3);

			// Set to round 4, Alice's turn
			draftState.current_round = 4;
			draftState.current_pick = 5; // Alice picks last in round 4 (snake)
			draftState.current_drafter = 'user_alice';

			// Auto-pick should also be female (need 2 females total)
			const pick4 = executeAutoPick(draftState, 'user_alice');
			expect(pick4?.golfer.gender).toBe('female');

			// Final team should be 2 males + 2 females
			const finalTeam = draftState.team_compositions['user_alice'];
			expect(finalTeam.male_count).toBe(2);
			// After this pick it would be 2 females
		});
	});
});
