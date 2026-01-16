/**
 * Draft system utilities for fantasy golf
 */

export type DraftDirection = 'down' | 'up';
export type Gender = 'male' | 'female';

export interface DraftGolfer {
	id: string;
	name: string;
	team?: string;
	team_id?: string;
	gender: Gender;
	drafted: boolean;
	drafted_by: string | null;
	ranking?: number | null; // 1 = best, lower is better. Undefined/null defaults to 999
}

export interface TeamComposition {
	male_count: number;
	female_count: number;
	total_picks: number;
	fantasy_team: DraftGolfer[];
}

export interface DraftState {
	available_golfers: DraftGolfer[];
	current_pick: number;
	current_round: number;
	current_drafter: string;
	draft_direction: DraftDirection;
	draft_started: boolean;
	draft_completed: boolean;
	team_compositions: Record<string, TeamComposition>;
}

export interface NextDrafterResult {
	nextDrafter: string;
	nextRound: number;
	nextPick: number;
	direction: DraftDirection;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param array - Array to shuffle
 * @returns New shuffled array
 */
export function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/**
 * Get the draft direction for a given round (snake draft)
 * Odd rounds go "down" (0 -> n-1), even rounds go "up" (n-1 -> 0)
 * @param round - Current round number (1-based)
 * @returns Draft direction
 */
export function getDraftDirection(round: number): DraftDirection {
	return round % 2 === 1 ? 'down' : 'up';
}

/**
 * Calculate the drafter index for a given pick in snake draft
 * @param pick - Pick number within the round (0-based)
 * @param totalParticipants - Total number of participants
 * @param direction - Current draft direction
 * @returns Index into draft order array
 */
export function getDrafterIndex(
	pick: number,
	totalParticipants: number,
	direction: DraftDirection
): number {
	if (direction === 'down') {
		return pick % totalParticipants;
	}
	// Reverse order for 'up' direction
	return totalParticipants - 1 - (pick % totalParticipants);
}

/**
 * Get the next drafter in snake draft order
 * @param draftOrder - Array of participant IDs in draft order
 * @param currentPick - Current pick number within round (0-based)
 * @param currentRound - Current round number (1-based)
 * @returns Next drafter info
 */
export function getNextDrafter(
	draftOrder: string[],
	currentPick: number,
	currentRound: number
): NextDrafterResult {
	const totalParticipants = draftOrder.length;

	let nextPick = currentPick + 1;
	let nextRound = currentRound;

	// Check if we've completed the round
	if (nextPick >= totalParticipants) {
		nextPick = 0;
		nextRound++;
	}

	const direction = getDraftDirection(nextRound);
	const drafterIndex = getDrafterIndex(nextPick, totalParticipants, direction);

	return {
		nextDrafter: draftOrder[drafterIndex],
		nextRound,
		nextPick,
		direction
	};
}

/**
 * Calculate total picks in a draft
 * @param participants - Number of participants
 * @param rounds - Number of rounds
 * @returns Total picks
 */
export function calculateTotalPicks(participants: number, rounds: number): number {
	return participants * rounds;
}

/**
 * Check if draft is complete
 * @param currentPick - Current overall pick number
 * @param totalPicks - Total picks in draft
 * @returns Whether draft is complete
 */
export function isDraftComplete(currentPick: number, totalPicks: number): boolean {
	return currentPick >= totalPicks;
}

/**
 * Get available (undrafted) golfers
 * @param golfers - All golfers
 * @returns Undrafted golfers
 */
export function getAvailableGolfers(golfers: DraftGolfer[]): DraftGolfer[] {
	return golfers.filter((g) => !g.drafted);
}

/**
 * Filter golfers by gender
 * @param golfers - Golfers to filter
 * @param gender - Gender to filter by
 * @returns Filtered golfers
 */
export function filterGolfersByGender(golfers: DraftGolfer[], gender: Gender): DraftGolfer[] {
	return golfers.filter((g) => g.gender === gender);
}

/**
 * Calculate recommended pick based on team composition and gender balance
 * Applies gender filtering for rounds 3+ to ensure balanced teams
 * @param availableGolfers - Golfers available to draft
 * @param teamComposition - Current team composition
 * @param currentRound - Current round number
 * @param totalRounds - Total rounds in draft
 * @returns Recommended golfer and filtered list
 */
export function getRecommendedPick(
	availableGolfers: DraftGolfer[],
	teamComposition: TeamComposition,
	currentRound: number,
	totalRounds: number
): { recommendedGolfer: DraftGolfer | null; filteredGolfers: DraftGolfer[] } {
	let filteredGolfers = getAvailableGolfers(availableGolfers);

	// Apply gender filtering for rounds 3 and beyond
	if (currentRound >= 3) {
		const { male_count, female_count, total_picks } = teamComposition;
		const picksRemaining = totalRounds - total_picks;

		// Calculate how many of each gender we need for balance
		const totalPicksTarget = total_picks + picksRemaining;
		const targetMales = Math.floor(totalPicksTarget / 2);
		const targetFemales = Math.ceil(totalPicksTarget / 2);

		// If we already have enough males, only show females
		if (male_count >= targetMales) {
			const femaleGolfers = filterGolfersByGender(filteredGolfers, 'female');
			if (femaleGolfers.length > 0) {
				filteredGolfers = femaleGolfers;
			}
		}
		// If we already have enough females, only show males
		else if (female_count >= targetFemales) {
			const maleGolfers = filterGolfersByGender(filteredGolfers, 'male');
			if (maleGolfers.length > 0) {
				filteredGolfers = maleGolfers;
			}
		}
	}

	// Select recommended golfer (first available after filtering)
	const recommendedGolfer = filteredGolfers.length > 0 ? filteredGolfers[0] : null;

	return { recommendedGolfer, filteredGolfers };
}

/**
 * Process a draft pick - updates golfer and team composition
 * @param golfer - Golfer being drafted
 * @param userId - User making the pick
 * @param teamComposition - Current team composition
 * @returns Updated team composition
 */
export function processDraftPick(
	golfer: DraftGolfer,
	userId: string,
	teamComposition: TeamComposition
): TeamComposition {
	// Mark golfer as drafted
	const draftedGolfer: DraftGolfer = {
		...golfer,
		drafted: true,
		drafted_by: userId
	};

	// Update team composition
	return {
		male_count: teamComposition.male_count + (golfer.gender === 'male' ? 1 : 0),
		female_count: teamComposition.female_count + (golfer.gender === 'female' ? 1 : 0),
		total_picks: teamComposition.total_picks + 1,
		fantasy_team: [...teamComposition.fantasy_team, draftedGolfer]
	};
}

/**
 * Create initial team composition for a participant
 * @returns Empty team composition
 */
export function createInitialTeamComposition(): TeamComposition {
	return {
		male_count: 0,
		female_count: 0,
		total_picks: 0,
		fantasy_team: []
	};
}

/**
 * Create initial draft state
 * @param draftOrder - Array of participant IDs
 * @param golfers - Available golfers
 * @returns Initial draft state
 */
export function createInitialDraftState(
	draftOrder: string[],
	golfers: DraftGolfer[]
): DraftState {
	const teamCompositions: Record<string, TeamComposition> = {};
	draftOrder.forEach((userId) => {
		teamCompositions[userId] = createInitialTeamComposition();
	});

	return {
		available_golfers: golfers.map((g) => ({ ...g, drafted: false, drafted_by: null })),
		current_pick: 0,
		current_round: 1,
		current_drafter: draftOrder[0],
		draft_direction: 'down',
		draft_started: false,
		draft_completed: false,
		team_compositions: teamCompositions
	};
}

/**
 * Validate that a user can make a pick
 * @param draftState - Current draft state
 * @param userId - User attempting to pick
 * @param golferId - Golfer being picked
 * @returns Validation result
 */
export function validateDraftPick(
	draftState: DraftState,
	userId: string,
	golferId: string
): { valid: boolean; error?: string } {
	if (draftState.draft_completed) {
		return { valid: false, error: 'Draft is already completed' };
	}

	if (!draftState.draft_started) {
		return { valid: false, error: 'Draft has not started yet' };
	}

	if (draftState.current_drafter !== userId) {
		return { valid: false, error: 'It is not your turn to pick' };
	}

	const golfer = draftState.available_golfers.find((g) => g.id === golferId);
	if (!golfer) {
		return { valid: false, error: 'Golfer not found' };
	}

	if (golfer.drafted) {
		return { valid: false, error: 'Golfer has already been drafted' };
	}

	return { valid: true };
}

/**
 * Get the pick number display (e.g., "Round 2, Pick 3")
 * @param round - Current round
 * @param pick - Pick within round
 * @returns Formatted pick string
 */
export function formatPickNumber(round: number, pick: number): string {
	return `Round ${round}, Pick ${pick + 1}`;
}

/**
 * Default ranking for golfers without a ranking
 */
export const DEFAULT_RANKING = 999;

/**
 * Get effective ranking for a golfer (handles undefined/null)
 * @param golfer - Golfer to get ranking for
 * @returns Ranking number (lower is better)
 */
export function getEffectiveRanking(golfer: DraftGolfer): number {
	return golfer.ranking ?? DEFAULT_RANKING;
}

/**
 * Sort golfers by ranking (best first)
 * @param golfers - Golfers to sort
 * @returns Sorted golfers array (does not mutate original)
 */
export function sortGolfersByRanking(golfers: DraftGolfer[]): DraftGolfer[] {
	return [...golfers].sort((a, b) => getEffectiveRanking(a) - getEffectiveRanking(b));
}

/**
 * Get the best ranked available golfer (recommended pick)
 * Respects gender filtering in rounds 3+
 * @param availableGolfers - All golfers in draft
 * @param teamComposition - Current team composition
 * @param currentRound - Current round number
 * @param totalRounds - Total rounds in draft
 * @returns Best ranked golfer from filtered list, or null if none available
 */
export function getBestRankedPick(
	availableGolfers: DraftGolfer[],
	teamComposition: TeamComposition,
	currentRound: number,
	totalRounds: number
): DraftGolfer | null {
	const { filteredGolfers } = getRecommendedPick(
		availableGolfers,
		teamComposition,
		currentRound,
		totalRounds
	);

	if (filteredGolfers.length === 0) {
		return null;
	}

	const sorted = sortGolfersByRanking(filteredGolfers);
	return sorted[0];
}

/**
 * Timer duration options in seconds
 */
export const TIMER_OPTIONS = [7, 15, 30, 45] as const;
export type TimerDuration = typeof TIMER_OPTIONS[number];

/**
 * Check if timer duration is valid
 * @param duration - Duration to check
 * @returns Whether duration is valid
 */
export function isValidTimerDuration(duration: number): duration is TimerDuration {
	return TIMER_OPTIONS.includes(duration as TimerDuration);
}

/**
 * Auto-pick result when timer expires
 */
export interface AutoPickResult {
	golfer: DraftGolfer;
	wasAutoPick: true;
}

/**
 * Execute auto-pick when timer expires
 * Returns the best ranked available golfer respecting gender filters
 * @param draftState - Current draft state
 * @param userId - User whose timer expired
 * @returns Auto-pick result or null if no valid pick available
 */
export function executeAutoPick(
	draftState: DraftState,
	userId: string
): AutoPickResult | null {
	if (draftState.current_drafter !== userId) {
		return null;
	}

	if (draftState.draft_completed || !draftState.draft_started) {
		return null;
	}

	const teamComposition = draftState.team_compositions[userId];
	if (!teamComposition) {
		return null;
	}

	// Determine current round from overall pick count
	const totalParticipants = Object.keys(draftState.team_compositions).length;
	const overallPick = (draftState.current_round - 1) * totalParticipants + draftState.current_pick;
	const currentRound = Math.floor(overallPick / totalParticipants) + 1;

	const bestPick = getBestRankedPick(
		draftState.available_golfers,
		teamComposition,
		currentRound,
		4 // Total rounds is fixed at 4
	);

	if (!bestPick) {
		return null;
	}

	return {
		golfer: bestPick,
		wasAutoPick: true
	};
}

/**
 * Calculate which overall pick number this is
 * @param round - Current round (1-based)
 * @param pick - Pick within round (0-based)
 * @param participantsPerRound - Number of participants
 * @returns Overall pick number (1-based)
 */
export function calculateOverallPick(
	round: number,
	pick: number,
	participantsPerRound: number
): number {
	return (round - 1) * participantsPerRound + pick + 1;
}
