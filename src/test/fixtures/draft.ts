/**
 * Test fixtures for draft scenarios
 * 6 participants, 24 golfers (12 male, 12 female), 4 rounds
 */

import type { DraftGolfer, DraftState, TeamComposition } from '$lib/draft/draftUtils';

// 6 participants in draft order
export const mockParticipants = [
	'user_alice',
	'user_bob',
	'user_charlie',
	'user_diana',
	'user_eve',
	'user_frank'
];

// 12 male golfers (ranked 1-12)
export const mockMaleGolfers: DraftGolfer[] = [
	{ id: 'male_01', name: 'Tiger Woods', team: 'Team A', gender: 'male', drafted: false, drafted_by: null, ranking: 1 },
	{ id: 'male_02', name: 'Rory McIlroy', team: 'Team B', gender: 'male', drafted: false, drafted_by: null, ranking: 2 },
	{ id: 'male_03', name: 'Jon Rahm', team: 'Team C', gender: 'male', drafted: false, drafted_by: null, ranking: 3 },
	{ id: 'male_04', name: 'Scottie Scheffler', team: 'Team D', gender: 'male', drafted: false, drafted_by: null, ranking: 4 },
	{ id: 'male_05', name: 'Patrick Cantlay', team: 'Team E', gender: 'male', drafted: false, drafted_by: null, ranking: 5 },
	{ id: 'male_06', name: 'Xander Schauffele', team: 'Team F', gender: 'male', drafted: false, drafted_by: null, ranking: 6 },
	{ id: 'male_07', name: 'Justin Thomas', team: 'Team G', gender: 'male', drafted: false, drafted_by: null, ranking: 7 },
	{ id: 'male_08', name: 'Collin Morikawa', team: 'Team H', gender: 'male', drafted: false, drafted_by: null, ranking: 8 },
	{ id: 'male_09', name: 'Viktor Hovland', team: 'Team I', gender: 'male', drafted: false, drafted_by: null, ranking: 9 },
	{ id: 'male_10', name: 'Matt Fitzpatrick', team: 'Team J', gender: 'male', drafted: false, drafted_by: null, ranking: 10 },
	{ id: 'male_11', name: 'Max Homa', team: 'Team K', gender: 'male', drafted: false, drafted_by: null, ranking: 11 },
	{ id: 'male_12', name: 'Tony Finau', team: 'Team L', gender: 'male', drafted: false, drafted_by: null, ranking: 12 }
];

// 12 female golfers (ranked 1-12)
export const mockFemaleGolfers: DraftGolfer[] = [
	{ id: 'female_01', name: 'Nelly Korda', team: 'Team A', gender: 'female', drafted: false, drafted_by: null, ranking: 1 },
	{ id: 'female_02', name: 'Lydia Ko', team: 'Team B', gender: 'female', drafted: false, drafted_by: null, ranking: 2 },
	{ id: 'female_03', name: 'Jin Young Ko', team: 'Team C', gender: 'female', drafted: false, drafted_by: null, ranking: 3 },
	{ id: 'female_04', name: 'Lilia Vu', team: 'Team D', gender: 'female', drafted: false, drafted_by: null, ranking: 4 },
	{ id: 'female_05', name: 'Celine Boutier', team: 'Team E', gender: 'female', drafted: false, drafted_by: null, ranking: 5 },
	{ id: 'female_06', name: 'Minjee Lee', team: 'Team F', gender: 'female', drafted: false, drafted_by: null, ranking: 6 },
	{ id: 'female_07', name: 'Lexi Thompson', team: 'Team G', gender: 'female', drafted: false, drafted_by: null, ranking: 7 },
	{ id: 'female_08', name: 'Brooke Henderson', team: 'Team H', gender: 'female', drafted: false, drafted_by: null, ranking: 8 },
	{ id: 'female_09', name: 'Atthaya Thitikul', team: 'Team I', gender: 'female', drafted: false, drafted_by: null, ranking: 9 },
	{ id: 'female_10', name: 'Hannah Green', team: 'Team J', gender: 'female', drafted: false, drafted_by: null, ranking: 10 },
	{ id: 'female_11', name: 'Rose Zhang', team: 'Team K', gender: 'female', drafted: false, drafted_by: null, ranking: 11 },
	{ id: 'female_12', name: 'Charley Hull', team: 'Team L', gender: 'female', drafted: false, drafted_by: null, ranking: 12 }
];

// All 24 golfers combined
export const mockAllGolfers: DraftGolfer[] = [...mockMaleGolfers, ...mockFemaleGolfers];

/**
 * Create a fresh copy of all golfers (to avoid mutation between tests)
 */
export function createMockGolfers(): DraftGolfer[] {
	return mockAllGolfers.map(g => ({ ...g, drafted: false, drafted_by: null }));
}

/**
 * Create initial team composition for a participant
 */
export function createEmptyTeamComposition(): TeamComposition {
	return {
		male_count: 0,
		female_count: 0,
		total_picks: 0,
		fantasy_team: []
	};
}

/**
 * Create team compositions for all 6 participants
 */
export function createAllTeamCompositions(): Record<string, TeamComposition> {
	const compositions: Record<string, TeamComposition> = {};
	mockParticipants.forEach(userId => {
		compositions[userId] = createEmptyTeamComposition();
	});
	return compositions;
}

/**
 * Create a complete initial draft state
 */
export function createInitialDraftState(): DraftState {
	return {
		available_golfers: createMockGolfers(),
		current_pick: 0,
		current_round: 1,
		current_drafter: mockParticipants[0],
		draft_direction: 'down',
		draft_started: true,
		draft_completed: false,
		team_compositions: createAllTeamCompositions()
	};
}

/**
 * Expected snake draft order for 6 participants over 4 rounds
 * Round 1 (down): Alice, Bob, Charlie, Diana, Eve, Frank
 * Round 2 (up):   Frank, Eve, Diana, Charlie, Bob, Alice
 * Round 3 (down): Alice, Bob, Charlie, Diana, Eve, Frank
 * Round 4 (up):   Frank, Eve, Diana, Charlie, Bob, Alice
 */
export const expectedSnakeDraftOrder = [
	// Round 1 (picks 1-6)
	'user_alice', 'user_bob', 'user_charlie', 'user_diana', 'user_eve', 'user_frank',
	// Round 2 (picks 7-12)
	'user_frank', 'user_eve', 'user_diana', 'user_charlie', 'user_bob', 'user_alice',
	// Round 3 (picks 13-18)
	'user_alice', 'user_bob', 'user_charlie', 'user_diana', 'user_eve', 'user_frank',
	// Round 4 (picks 19-24)
	'user_frank', 'user_eve', 'user_diana', 'user_charlie', 'user_bob', 'user_alice'
];

/**
 * Create a draft state at a specific point in the draft
 * @param picksMade - Number of picks already made
 * @param pickHistory - Array of { userId, golferId } for picks made
 */
export function createDraftStateAtPick(
	picksMade: number,
	pickHistory: Array<{ userId: string; golferId: string }>
): DraftState {
	const state = createInitialDraftState();
	
	// Process each pick in history
	pickHistory.forEach(({ userId, golferId }) => {
		const golfer = state.available_golfers.find(g => g.id === golferId);
		if (golfer) {
			golfer.drafted = true;
			golfer.drafted_by = userId;
			
			const teamComp = state.team_compositions[userId];
			if (golfer.gender === 'male') {
				teamComp.male_count++;
			} else {
				teamComp.female_count++;
			}
			teamComp.total_picks++;
			teamComp.fantasy_team.push({ ...golfer });
		}
	});
	
	// Calculate current position
	const round = Math.floor(picksMade / 6) + 1;
	const pickInRound = picksMade % 6;
	
	state.current_round = round;
	state.current_pick = pickInRound;
	state.draft_direction = round % 2 === 1 ? 'down' : 'up';
	
	if (picksMade < 24) {
		state.current_drafter = expectedSnakeDraftOrder[picksMade];
	} else {
		state.draft_completed = true;
	}
	
	return state;
}

/**
 * Scenario: Participant has picked 2 males in rounds 1-2
 * In rounds 3-4, they should only see females
 */
export function createTeamWith2Males(): TeamComposition {
	return {
		male_count: 2,
		female_count: 0,
		total_picks: 2,
		fantasy_team: [
			{ ...mockMaleGolfers[0], drafted: true, drafted_by: 'user_alice' },
			{ ...mockMaleGolfers[1], drafted: true, drafted_by: 'user_alice' }
		]
	};
}

/**
 * Scenario: Participant has picked 2 females in rounds 1-2
 * In rounds 3-4, they should only see males
 */
export function createTeamWith2Females(): TeamComposition {
	return {
		male_count: 0,
		female_count: 2,
		total_picks: 2,
		fantasy_team: [
			{ ...mockFemaleGolfers[0], drafted: true, drafted_by: 'user_alice' },
			{ ...mockFemaleGolfers[1], drafted: true, drafted_by: 'user_alice' }
		]
	};
}

/**
 * Scenario: Participant has picked 1 male + 1 female in rounds 1-2
 * In rounds 3-4, they can pick either gender
 */
export function createTeamWith1Each(): TeamComposition {
	return {
		male_count: 1,
		female_count: 1,
		total_picks: 2,
		fantasy_team: [
			{ ...mockMaleGolfers[0], drafted: true, drafted_by: 'user_alice' },
			{ ...mockFemaleGolfers[0], drafted: true, drafted_by: 'user_alice' }
		]
	};
}

/**
 * Scenario: Participant has 2 males + 1 female after round 3
 * In round 4, they MUST pick a female
 */
export function createTeamWith2Males1Female(): TeamComposition {
	return {
		male_count: 2,
		female_count: 1,
		total_picks: 3,
		fantasy_team: [
			{ ...mockMaleGolfers[0], drafted: true, drafted_by: 'user_alice' },
			{ ...mockMaleGolfers[1], drafted: true, drafted_by: 'user_alice' },
			{ ...mockFemaleGolfers[0], drafted: true, drafted_by: 'user_alice' }
		]
	};
}

/**
 * Scenario: Participant has 1 male + 2 females after round 3
 * In round 4, they MUST pick a male
 */
export function createTeamWith1Male2Females(): TeamComposition {
	return {
		male_count: 1,
		female_count: 2,
		total_picks: 3,
		fantasy_team: [
			{ ...mockMaleGolfers[0], drafted: true, drafted_by: 'user_alice' },
			{ ...mockFemaleGolfers[0], drafted: true, drafted_by: 'user_alice' },
			{ ...mockFemaleGolfers[1], drafted: true, drafted_by: 'user_alice' }
		]
	};
}

/**
 * Complete team: 2 males + 2 females
 */
export function createCompleteTeam(): TeamComposition {
	return {
		male_count: 2,
		female_count: 2,
		total_picks: 4,
		fantasy_team: [
			{ ...mockMaleGolfers[0], drafted: true, drafted_by: 'user_alice' },
			{ ...mockMaleGolfers[1], drafted: true, drafted_by: 'user_alice' },
			{ ...mockFemaleGolfers[0], drafted: true, drafted_by: 'user_alice' },
			{ ...mockFemaleGolfers[1], drafted: true, drafted_by: 'user_alice' }
		]
	};
}
