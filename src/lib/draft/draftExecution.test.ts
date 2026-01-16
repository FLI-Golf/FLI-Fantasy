import { describe, it, expect, beforeEach } from 'vitest';
import {
	getNextDrafter,
	getRecommendedPick,
	validateDraftPick,
	processDraftPick,
	getAvailableGolfers,
	filterGolfersByGender,
	isDraftComplete,
	calculateTotalPicks,
	getDraftDirection,
	type DraftState,
	type DraftGolfer,
	type TeamComposition
} from './draftUtils';
import {
	mockParticipants,
	mockMaleGolfers,
	mockFemaleGolfers,
	createMockGolfers,
	createInitialDraftState,
	createAllTeamCompositions,
	expectedSnakeDraftOrder,
	createTeamWith2Males,
	createTeamWith2Females,
	createTeamWith1Each,
	createTeamWith2Males1Female,
	createTeamWith1Male2Females,
	createCompleteTeam
} from '../../test/fixtures/draft';

describe('Draft Execution - 6 Participants, 24 Golfers, 4 Rounds', () => {
	describe('Snake Draft Order', () => {
		it('should have correct total picks (6 participants × 4 rounds = 24)', () => {
			const totalPicks = calculateTotalPicks(6, 4);
			expect(totalPicks).toBe(24);
		});

		it('should match expected snake order for all 24 picks', () => {
			const draftOrder = mockParticipants;
			const actualOrder: string[] = [];

			// First pick is always first person in draft order
			actualOrder.push(draftOrder[0]);

			// Generate remaining 23 picks
			let currentPick = 0;
			let currentRound = 1;

			for (let i = 1; i < 24; i++) {
				const result = getNextDrafter(draftOrder, currentPick, currentRound);
				actualOrder.push(result.nextDrafter);
				currentPick = result.nextPick;
				currentRound = result.nextRound;
			}

			expect(actualOrder).toEqual(expectedSnakeDraftOrder);
		});

		it('should go down in round 1 (Alice → Frank)', () => {
			expect(getDraftDirection(1)).toBe('down');
			
			const round1Order = expectedSnakeDraftOrder.slice(0, 6);
			expect(round1Order).toEqual([
				'user_alice', 'user_bob', 'user_charlie', 
				'user_diana', 'user_eve', 'user_frank'
			]);
		});

		it('should go up in round 2 (Frank → Alice)', () => {
			expect(getDraftDirection(2)).toBe('up');
			
			const round2Order = expectedSnakeDraftOrder.slice(6, 12);
			expect(round2Order).toEqual([
				'user_frank', 'user_eve', 'user_diana',
				'user_charlie', 'user_bob', 'user_alice'
			]);
		});

		it('should go down in round 3 (Alice → Frank)', () => {
			expect(getDraftDirection(3)).toBe('down');
			
			const round3Order = expectedSnakeDraftOrder.slice(12, 18);
			expect(round3Order).toEqual([
				'user_alice', 'user_bob', 'user_charlie',
				'user_diana', 'user_eve', 'user_frank'
			]);
		});

		it('should go up in round 4 (Frank → Alice)', () => {
			expect(getDraftDirection(4)).toBe('up');
			
			const round4Order = expectedSnakeDraftOrder.slice(18, 24);
			expect(round4Order).toEqual([
				'user_frank', 'user_eve', 'user_diana',
				'user_charlie', 'user_bob', 'user_alice'
			]);
		});

		it('should give Frank back-to-back picks at round transitions (picks 6-7, 18-19)', () => {
			// End of round 1 (pick 6) and start of round 2 (pick 7)
			expect(expectedSnakeDraftOrder[5]).toBe('user_frank');
			expect(expectedSnakeDraftOrder[6]).toBe('user_frank');

			// End of round 3 (pick 18) and start of round 4 (pick 19)
			expect(expectedSnakeDraftOrder[17]).toBe('user_frank');
			expect(expectedSnakeDraftOrder[18]).toBe('user_frank');
		});

		it('should give Alice back-to-back picks at round transitions (picks 12-13)', () => {
			// End of round 2 (pick 12) and start of round 3 (pick 13)
			expect(expectedSnakeDraftOrder[11]).toBe('user_alice');
			expect(expectedSnakeDraftOrder[12]).toBe('user_alice');
		});
	});

	describe('Rounds 1-2: No Gender Filtering', () => {
		it('should show all 24 golfers at start of draft', () => {
			const golfers = createMockGolfers();
			const teamComp: TeamComposition = {
				male_count: 0,
				female_count: 0,
				total_picks: 0,
				fantasy_team: []
			};

			const result = getRecommendedPick(golfers, teamComp, 1, 4);

			expect(result.filteredGolfers).toHaveLength(24);
			expect(result.filteredGolfers.filter(g => g.gender === 'male')).toHaveLength(12);
			expect(result.filteredGolfers.filter(g => g.gender === 'female')).toHaveLength(12);
		});

		it('should show all available golfers in round 1 regardless of picks', () => {
			const golfers = createMockGolfers();
			// Mark 2 golfers as drafted
			golfers[0].drafted = true;
			golfers[12].drafted = true;

			const teamComp: TeamComposition = {
				male_count: 1,
				female_count: 0,
				total_picks: 1,
				fantasy_team: []
			};

			const result = getRecommendedPick(golfers, teamComp, 1, 4);

			// Should show 22 remaining golfers (no gender filter in round 1)
			expect(result.filteredGolfers).toHaveLength(22);
		});

		it('should show all available golfers in round 2 regardless of team composition', () => {
			const golfers = createMockGolfers();
			// Mark 6 golfers as drafted (end of round 1)
			for (let i = 0; i < 6; i++) {
				golfers[i].drafted = true;
			}

			// Participant has 1 male pick
			const teamComp: TeamComposition = {
				male_count: 1,
				female_count: 0,
				total_picks: 1,
				fantasy_team: []
			};

			const result = getRecommendedPick(golfers, teamComp, 2, 4);

			// Should show 18 remaining golfers (no gender filter in round 2)
			expect(result.filteredGolfers).toHaveLength(18);
			// Both genders should be available
			expect(result.filteredGolfers.some(g => g.gender === 'male')).toBe(true);
			expect(result.filteredGolfers.some(g => g.gender === 'female')).toBe(true);
		});

		it('should allow picking any gender in rounds 1-2 even with imbalanced team', () => {
			const golfers = createMockGolfers();
			
			// Participant picked 2 males already
			const teamComp = createTeamWith2Males();

			// Round 2 - should still show all genders
			const result = getRecommendedPick(golfers, teamComp, 2, 4);

			expect(result.filteredGolfers.some(g => g.gender === 'male')).toBe(true);
			expect(result.filteredGolfers.some(g => g.gender === 'female')).toBe(true);
		});
	});

	describe('Rounds 3-4: Gender Filtering', () => {
		it('should only show females in round 3 if participant has 2 males', () => {
			const golfers = createMockGolfers();
			const teamComp = createTeamWith2Males();

			const result = getRecommendedPick(golfers, teamComp, 3, 4);

			expect(result.filteredGolfers.every(g => g.gender === 'female')).toBe(true);
			expect(result.recommendedGolfer?.gender).toBe('female');
		});

		it('should only show males in round 3 if participant has 2 females', () => {
			const golfers = createMockGolfers();
			const teamComp = createTeamWith2Females();

			const result = getRecommendedPick(golfers, teamComp, 3, 4);

			expect(result.filteredGolfers.every(g => g.gender === 'male')).toBe(true);
			expect(result.recommendedGolfer?.gender).toBe('male');
		});

		it('should show both genders in round 3 if participant has 1 male + 1 female', () => {
			const golfers = createMockGolfers();
			const teamComp = createTeamWith1Each();

			const result = getRecommendedPick(golfers, teamComp, 3, 4);

			expect(result.filteredGolfers.some(g => g.gender === 'male')).toBe(true);
			expect(result.filteredGolfers.some(g => g.gender === 'female')).toBe(true);
		});

		it('should only show females in round 4 if participant has 2 males + 1 female', () => {
			const golfers = createMockGolfers();
			const teamComp = createTeamWith2Males1Female();

			const result = getRecommendedPick(golfers, teamComp, 4, 4);

			expect(result.filteredGolfers.every(g => g.gender === 'female')).toBe(true);
		});

		it('should only show males in round 4 if participant has 1 male + 2 females', () => {
			const golfers = createMockGolfers();
			const teamComp = createTeamWith1Male2Females();

			const result = getRecommendedPick(golfers, teamComp, 4, 4);

			expect(result.filteredGolfers.every(g => g.gender === 'male')).toBe(true);
		});

		it('should enforce 2+2 balance: cannot end with 3 males + 1 female', () => {
			const golfers = createMockGolfers();
			
			// After round 3: 2 males + 1 female
			const teamComp = createTeamWith2Males1Female();

			// Round 4: must pick female
			const result = getRecommendedPick(golfers, teamComp, 4, 4);

			// Only females should be available
			expect(result.filteredGolfers.every(g => g.gender === 'female')).toBe(true);
			expect(result.filteredGolfers.length).toBeGreaterThan(0);
		});

		it('should enforce 2+2 balance: cannot end with 1 male + 3 females', () => {
			const golfers = createMockGolfers();
			
			// After round 3: 1 male + 2 females
			const teamComp = createTeamWith1Male2Females();

			// Round 4: must pick male
			const result = getRecommendedPick(golfers, teamComp, 4, 4);

			// Only males should be available
			expect(result.filteredGolfers.every(g => g.gender === 'male')).toBe(true);
			expect(result.filteredGolfers.length).toBeGreaterThan(0);
		});
	});

	describe('Pick Validation', () => {
		let draftState: DraftState;

		beforeEach(() => {
			draftState = createInitialDraftState();
		});

		it('should allow valid pick from current drafter', () => {
			const result = validateDraftPick(draftState, 'user_alice', 'male_01');

			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should reject pick from wrong user (not their turn)', () => {
			const result = validateDraftPick(draftState, 'user_bob', 'male_01');

			expect(result.valid).toBe(false);
			expect(result.error).toBe('It is not your turn to pick');
		});

		it('should reject pick of already drafted golfer', () => {
			// Mark golfer as drafted
			draftState.available_golfers[0].drafted = true;
			draftState.available_golfers[0].drafted_by = 'user_bob';

			const result = validateDraftPick(draftState, 'user_alice', 'male_01');

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Golfer has already been drafted');
		});

		it('should reject pick of non-existent golfer', () => {
			const result = validateDraftPick(draftState, 'user_alice', 'invalid_golfer_id');

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Golfer not found');
		});

		it('should reject pick when draft not started', () => {
			draftState.draft_started = false;

			const result = validateDraftPick(draftState, 'user_alice', 'male_01');

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Draft has not started yet');
		});

		it('should reject pick when draft is completed', () => {
			draftState.draft_completed = true;

			const result = validateDraftPick(draftState, 'user_alice', 'male_01');

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Draft is already completed');
		});
	});

	describe('Draft Completion', () => {
		it('should not be complete before 24 picks', () => {
			expect(isDraftComplete(0, 24)).toBe(false);
			expect(isDraftComplete(12, 24)).toBe(false);
			expect(isDraftComplete(23, 24)).toBe(false);
		});

		it('should be complete at exactly 24 picks', () => {
			expect(isDraftComplete(24, 24)).toBe(true);
		});

		it('should be complete after 24 picks', () => {
			expect(isDraftComplete(25, 24)).toBe(true);
		});

		it('should have all 24 golfers drafted when complete', () => {
			const golfers = createMockGolfers();
			
			// Mark all as drafted
			golfers.forEach((g, i) => {
				g.drafted = true;
				g.drafted_by = mockParticipants[i % 6];
			});

			const available = getAvailableGolfers(golfers);
			expect(available).toHaveLength(0);
		});
	});

	describe('Team Composition Tracking', () => {
		it('should update male count when drafting male golfer', () => {
			const golfer = mockMaleGolfers[0];
			const teamComp: TeamComposition = {
				male_count: 0,
				female_count: 0,
				total_picks: 0,
				fantasy_team: []
			};

			const result = processDraftPick(golfer, 'user_alice', teamComp);

			expect(result.male_count).toBe(1);
			expect(result.female_count).toBe(0);
			expect(result.total_picks).toBe(1);
		});

		it('should update female count when drafting female golfer', () => {
			const golfer = mockFemaleGolfers[0];
			const teamComp: TeamComposition = {
				male_count: 0,
				female_count: 0,
				total_picks: 0,
				fantasy_team: []
			};

			const result = processDraftPick(golfer, 'user_alice', teamComp);

			expect(result.male_count).toBe(0);
			expect(result.female_count).toBe(1);
			expect(result.total_picks).toBe(1);
		});

		it('should add golfer to fantasy team', () => {
			const golfer = mockMaleGolfers[0];
			const teamComp: TeamComposition = {
				male_count: 0,
				female_count: 0,
				total_picks: 0,
				fantasy_team: []
			};

			const result = processDraftPick(golfer, 'user_alice', teamComp);

			expect(result.fantasy_team).toHaveLength(1);
			expect(result.fantasy_team[0].id).toBe(golfer.id);
			expect(result.fantasy_team[0].drafted).toBe(true);
			expect(result.fantasy_team[0].drafted_by).toBe('user_alice');
		});

		it('should accumulate picks correctly over 4 rounds', () => {
			let teamComp: TeamComposition = {
				male_count: 0,
				female_count: 0,
				total_picks: 0,
				fantasy_team: []
			};

			// Round 1: pick male
			teamComp = processDraftPick(mockMaleGolfers[0], 'user_alice', teamComp);
			expect(teamComp.total_picks).toBe(1);
			expect(teamComp.male_count).toBe(1);

			// Round 2: pick male
			teamComp = processDraftPick(mockMaleGolfers[1], 'user_alice', teamComp);
			expect(teamComp.total_picks).toBe(2);
			expect(teamComp.male_count).toBe(2);

			// Round 3: pick female (forced by filter)
			teamComp = processDraftPick(mockFemaleGolfers[0], 'user_alice', teamComp);
			expect(teamComp.total_picks).toBe(3);
			expect(teamComp.female_count).toBe(1);

			// Round 4: pick female (forced by filter)
			teamComp = processDraftPick(mockFemaleGolfers[1], 'user_alice', teamComp);
			expect(teamComp.total_picks).toBe(4);
			expect(teamComp.female_count).toBe(2);

			// Final: 2 males + 2 females
			expect(teamComp.male_count).toBe(2);
			expect(teamComp.female_count).toBe(2);
			expect(teamComp.fantasy_team).toHaveLength(4);
		});

		it('should result in complete team with 2 males + 2 females', () => {
			const completeTeam = createCompleteTeam();

			expect(completeTeam.male_count).toBe(2);
			expect(completeTeam.female_count).toBe(2);
			expect(completeTeam.total_picks).toBe(4);
			expect(completeTeam.fantasy_team).toHaveLength(4);
		});
	});

	describe('Full Draft Simulation', () => {
		it('should complete a full 24-pick draft with all teams having 2+2 balance', () => {
			const golfers = createMockGolfers();
			const teamCompositions = createAllTeamCompositions();
			let pickCount = 0;

			// Simulate all 24 picks following snake order
			for (let round = 1; round <= 4; round++) {
				for (let pickInRound = 0; pickInRound < 6; pickInRound++) {
					const drafterIndex = expectedSnakeDraftOrder.indexOf(
						expectedSnakeDraftOrder[pickCount]
					);
					const drafter = expectedSnakeDraftOrder[pickCount];
					const teamComp = teamCompositions[drafter];

					// Get available golfers with filtering
					const { filteredGolfers } = getRecommendedPick(golfers, teamComp, round, 4);

					// Pick first available golfer
					const golferToPick = filteredGolfers[0];
					expect(golferToPick).toBeDefined();

					// Process the pick
					golferToPick.drafted = true;
					golferToPick.drafted_by = drafter;
					teamCompositions[drafter] = processDraftPick(golferToPick, drafter, teamComp);

					pickCount++;
				}
			}

			// Verify all 24 picks made
			expect(pickCount).toBe(24);

			// Verify all golfers drafted
			const remaining = getAvailableGolfers(golfers);
			expect(remaining).toHaveLength(0);

			// Verify each team has 2 males + 2 females
			mockParticipants.forEach(userId => {
				const team = teamCompositions[userId];
				expect(team.total_picks).toBe(4);
				expect(team.male_count).toBe(2);
				expect(team.female_count).toBe(2);
				expect(team.fantasy_team).toHaveLength(4);
			});
		});

		it('should handle worst-case scenario: all participants pick same gender in rounds 1-2', () => {
			const golfers = createMockGolfers();
			const teamCompositions = createAllTeamCompositions();

			// Rounds 1-2: Everyone picks males (12 males drafted)
			const maleGolfers = golfers.filter(g => g.gender === 'male');
			let maleIndex = 0;

			for (let round = 1; round <= 2; round++) {
				for (let pickInRound = 0; pickInRound < 6; pickInRound++) {
					const pickNumber = (round - 1) * 6 + pickInRound;
					const drafter = expectedSnakeDraftOrder[pickNumber];
					const golfer = maleGolfers[maleIndex++];

					golfer.drafted = true;
					golfer.drafted_by = drafter;
					teamCompositions[drafter] = processDraftPick(
						golfer,
						drafter,
						teamCompositions[drafter]
					);
				}
			}

			// After rounds 1-2: each participant has 2 males
			mockParticipants.forEach(userId => {
				expect(teamCompositions[userId].male_count).toBe(2);
				expect(teamCompositions[userId].female_count).toBe(0);
			});

			// Rounds 3-4: Everyone MUST pick females (filter enforced)
			for (let round = 3; round <= 4; round++) {
				for (let pickInRound = 0; pickInRound < 6; pickInRound++) {
					const pickNumber = (round - 1) * 6 + pickInRound;
					const drafter = expectedSnakeDraftOrder[pickNumber];
					const teamComp = teamCompositions[drafter];

					const { filteredGolfers } = getRecommendedPick(golfers, teamComp, round, 4);

					// Should only show females
					expect(filteredGolfers.every(g => g.gender === 'female')).toBe(true);

					const golfer = filteredGolfers[0];
					golfer.drafted = true;
					golfer.drafted_by = drafter;
					teamCompositions[drafter] = processDraftPick(golfer, drafter, teamComp);
				}
			}

			// Final: each team has 2 males + 2 females
			mockParticipants.forEach(userId => {
				expect(teamCompositions[userId].male_count).toBe(2);
				expect(teamCompositions[userId].female_count).toBe(2);
			});
		});
	});
});
