/**
 * Draft Management - JSONB structure for storing draft state
 * This is stored in the fantasy_tournament.draft_management field
 */

import type { DraftGolfer, TeamComposition, TimerDuration } from './draftUtils';
import { TIMER_OPTIONS, DEFAULT_RANKING } from './draftUtils';

export type DraftStatus = 'pending' | 'in_progress' | 'paused' | 'completed';

export interface DraftPick {
	pick_number: number; // Overall pick number (1-24)
	round: number; // Round number (1-4)
	pick_in_round: number; // Pick within round (0-5)
	user_id: string; // Who made the pick
	golfer_id: string; // Golfer picked
	golfer_name: string; // For display
	golfer_gender: 'male' | 'female';
	golfer_ranking: number;
	timestamp: string; // ISO timestamp
	was_auto_pick: boolean; // True if timer expired
}

export interface DraftManagement {
	// Status
	status: DraftStatus;
	
	// Settings (set before draft starts)
	timer_duration: TimerDuration; // 7, 15, 30, or 45 seconds
	total_rounds: number; // Fixed at 4
	total_participants: number; // Fixed at 6
	
	// Draft order (randomized when draft is created)
	draft_order: string[]; // Array of user IDs in draft order
	
	// Current state
	current_round: number; // 1-4
	current_pick: number; // 0-5 within round
	current_drafter: string; // User ID of current drafter
	current_direction: 'down' | 'up'; // Snake direction
	
	// Timer
	timer_started_at: string | null; // ISO timestamp when current pick timer started
	timer_paused_at: string | null; // ISO timestamp if paused
	timer_remaining_ms: number | null; // Remaining time if paused
	
	// Golfers
	available_golfers: DraftGolfer[]; // All golfers with drafted status
	
	// Team compositions per participant
	team_compositions: Record<string, TeamComposition>;
	
	// Pick history (for undo and display)
	pick_history: DraftPick[];
	
	// Timestamps
	created_at: string;
	started_at: string | null;
	completed_at: string | null;
	
	// Error tracking
	last_error: string | null;
}

/**
 * Create initial draft management state
 */
export function createDraftManagement(
	draftOrder: string[],
	golfers: DraftGolfer[],
	timerDuration: TimerDuration = 7
): DraftManagement {
	const teamCompositions: Record<string, TeamComposition> = {};
	draftOrder.forEach(userId => {
		teamCompositions[userId] = {
			male_count: 0,
			female_count: 0,
			total_picks: 0,
			fantasy_team: []
		};
	});

	// Ensure all golfers have ranking (default to 999)
	const golfersWithRanking = golfers.map(g => ({
		...g,
		ranking: g.ranking ?? DEFAULT_RANKING,
		drafted: false,
		drafted_by: null
	}));

	return {
		status: 'pending',
		timer_duration: timerDuration,
		total_rounds: 4,
		total_participants: 6,
		draft_order: draftOrder,
		current_round: 1,
		current_pick: 0,
		current_drafter: draftOrder[0],
		current_direction: 'down',
		timer_started_at: null,
		timer_paused_at: null,
		timer_remaining_ms: null,
		available_golfers: golfersWithRanking,
		team_compositions: teamCompositions,
		pick_history: [],
		created_at: new Date().toISOString(),
		started_at: null,
		completed_at: null,
		last_error: null
	};
}

/**
 * Start the draft
 */
export function startDraft(draft: DraftManagement): DraftManagement {
	if (draft.status !== 'pending') {
		return { ...draft, last_error: 'Draft can only be started from pending status' };
	}

	if (draft.draft_order.length !== 6) {
		return { ...draft, last_error: 'Draft requires exactly 6 participants' };
	}

	if (draft.available_golfers.length !== 24) {
		return { ...draft, last_error: 'Draft requires exactly 24 golfers' };
	}

	const now = new Date().toISOString();
	return {
		...draft,
		status: 'in_progress',
		started_at: now,
		timer_started_at: now,
		last_error: null
	};
}

/**
 * Pause the draft (owner only)
 */
export function pauseDraft(draft: DraftManagement): DraftManagement {
	if (draft.status !== 'in_progress') {
		return { ...draft, last_error: 'Can only pause an in-progress draft' };
	}

	const now = new Date();
	const timerStarted = draft.timer_started_at ? new Date(draft.timer_started_at) : now;
	const elapsed = now.getTime() - timerStarted.getTime();
	const remaining = Math.max(0, draft.timer_duration * 1000 - elapsed);

	return {
		...draft,
		status: 'paused',
		timer_paused_at: now.toISOString(),
		timer_remaining_ms: remaining,
		last_error: null
	};
}

/**
 * Resume the draft (owner only)
 */
export function resumeDraft(draft: DraftManagement): DraftManagement {
	if (draft.status !== 'paused') {
		return { ...draft, last_error: 'Can only resume a paused draft' };
	}

	// Calculate new timer start to account for remaining time
	const now = new Date();
	const remaining = draft.timer_remaining_ms ?? draft.timer_duration * 1000;
	const adjustedStart = new Date(now.getTime() - (draft.timer_duration * 1000 - remaining));

	return {
		...draft,
		status: 'in_progress',
		timer_started_at: adjustedStart.toISOString(),
		timer_paused_at: null,
		timer_remaining_ms: null,
		last_error: null
	};
}

/**
 * Reset the draft (owner only) - clears all picks and starts over
 */
export function resetDraft(draft: DraftManagement): DraftManagement {
	// Reset all golfers to undrafted
	const resetGolfers = draft.available_golfers.map(g => ({
		...g,
		drafted: false,
		drafted_by: null
	}));

	// Reset all team compositions
	const resetTeamComps: Record<string, TeamComposition> = {};
	draft.draft_order.forEach(userId => {
		resetTeamComps[userId] = {
			male_count: 0,
			female_count: 0,
			total_picks: 0,
			fantasy_team: []
		};
	});

	return {
		...draft,
		status: 'pending',
		current_round: 1,
		current_pick: 0,
		current_drafter: draft.draft_order[0],
		current_direction: 'down',
		timer_started_at: null,
		timer_paused_at: null,
		timer_remaining_ms: null,
		available_golfers: resetGolfers,
		team_compositions: resetTeamComps,
		pick_history: [],
		started_at: null,
		completed_at: null,
		last_error: null
	};
}

/**
 * Undo the last pick (owner only)
 */
export function undoLastPick(draft: DraftManagement): DraftManagement {
	if (draft.pick_history.length === 0) {
		return { ...draft, last_error: 'No picks to undo' };
	}

	if (draft.status === 'completed') {
		// Allow undo from completed state
	} else if (draft.status !== 'in_progress' && draft.status !== 'paused') {
		return { ...draft, last_error: 'Can only undo picks during active draft' };
	}

	const lastPick = draft.pick_history[draft.pick_history.length - 1];
	const newHistory = draft.pick_history.slice(0, -1);

	// Restore golfer to available
	const updatedGolfers = draft.available_golfers.map(g => {
		if (g.id === lastPick.golfer_id) {
			return { ...g, drafted: false, drafted_by: null };
		}
		return g;
	});

	// Update team composition
	const teamComp = draft.team_compositions[lastPick.user_id];
	const updatedTeamComp: TeamComposition = {
		male_count: teamComp.male_count - (lastPick.golfer_gender === 'male' ? 1 : 0),
		female_count: teamComp.female_count - (lastPick.golfer_gender === 'female' ? 1 : 0),
		total_picks: teamComp.total_picks - 1,
		fantasy_team: teamComp.fantasy_team.filter(g => g.id !== lastPick.golfer_id)
	};

	// Restore draft position to last pick's position
	const newStatus = draft.status === 'completed' ? 'paused' : draft.status;

	return {
		...draft,
		status: newStatus,
		current_round: lastPick.round,
		current_pick: lastPick.pick_in_round,
		current_drafter: lastPick.user_id,
		current_direction: lastPick.round % 2 === 1 ? 'down' : 'up',
		available_golfers: updatedGolfers,
		team_compositions: {
			...draft.team_compositions,
			[lastPick.user_id]: updatedTeamComp
		},
		pick_history: newHistory,
		completed_at: null,
		timer_started_at: draft.status === 'in_progress' ? new Date().toISOString() : null,
		last_error: null
	};
}

/**
 * Make a draft pick
 */
export function makePick(
	draft: DraftManagement,
	userId: string,
	golferId: string,
	isAutoPick: boolean = false
): DraftManagement {
	// Validate draft is in progress
	if (draft.status !== 'in_progress') {
		return { ...draft, last_error: 'Draft is not in progress' };
	}

	// Validate it's the user's turn
	if (draft.current_drafter !== userId) {
		return { ...draft, last_error: 'It is not your turn to pick' };
	}

	// Find the golfer
	const golfer = draft.available_golfers.find(g => g.id === golferId);
	if (!golfer) {
		return { ...draft, last_error: 'Golfer not found' };
	}

	if (golfer.drafted) {
		return { ...draft, last_error: 'Golfer has already been drafted' };
	}

	// Calculate overall pick number
	const overallPick = (draft.current_round - 1) * 6 + draft.current_pick + 1;

	// Create pick record
	const pick: DraftPick = {
		pick_number: overallPick,
		round: draft.current_round,
		pick_in_round: draft.current_pick,
		user_id: userId,
		golfer_id: golferId,
		golfer_name: golfer.name,
		golfer_gender: golfer.gender,
		golfer_ranking: golfer.ranking ?? DEFAULT_RANKING,
		timestamp: new Date().toISOString(),
		was_auto_pick: isAutoPick
	};

	// Update golfer status
	const updatedGolfers = draft.available_golfers.map(g => {
		if (g.id === golferId) {
			return { ...g, drafted: true, drafted_by: userId };
		}
		return g;
	});

	// Update team composition
	const teamComp = draft.team_compositions[userId];
	const draftedGolfer: DraftGolfer = { ...golfer, drafted: true, drafted_by: userId };
	const updatedTeamComp: TeamComposition = {
		male_count: teamComp.male_count + (golfer.gender === 'male' ? 1 : 0),
		female_count: teamComp.female_count + (golfer.gender === 'female' ? 1 : 0),
		total_picks: teamComp.total_picks + 1,
		fantasy_team: [...teamComp.fantasy_team, draftedGolfer]
	};

	// Calculate next drafter
	let nextPick = draft.current_pick + 1;
	let nextRound = draft.current_round;
	let nextDirection = draft.current_direction;

	if (nextPick >= 6) {
		nextPick = 0;
		nextRound++;
		nextDirection = nextRound % 2 === 1 ? 'down' : 'up';
	}

	// Check if draft is complete
	const isComplete = overallPick >= 24;

	// Calculate next drafter index
	let nextDrafterIndex: number;
	if (nextDirection === 'down') {
		nextDrafterIndex = nextPick;
	} else {
		nextDrafterIndex = 5 - nextPick;
	}
	const nextDrafter = isComplete ? draft.current_drafter : draft.draft_order[nextDrafterIndex];

	return {
		...draft,
		status: isComplete ? 'completed' : 'in_progress',
		current_round: isComplete ? draft.current_round : nextRound,
		current_pick: isComplete ? draft.current_pick : nextPick,
		current_drafter: nextDrafter,
		current_direction: nextDirection,
		timer_started_at: isComplete ? null : new Date().toISOString(),
		available_golfers: updatedGolfers,
		team_compositions: {
			...draft.team_compositions,
			[userId]: updatedTeamComp
		},
		pick_history: [...draft.pick_history, pick],
		completed_at: isComplete ? new Date().toISOString() : null,
		last_error: null
	};
}

/**
 * Get remaining time on current pick timer
 */
export function getTimerRemaining(draft: DraftManagement): number {
	if (draft.status === 'paused') {
		return draft.timer_remaining_ms ?? 0;
	}

	if (draft.status !== 'in_progress' || !draft.timer_started_at) {
		return 0;
	}

	const now = new Date().getTime();
	const started = new Date(draft.timer_started_at).getTime();
	const elapsed = now - started;
	const remaining = draft.timer_duration * 1000 - elapsed;

	return Math.max(0, remaining);
}

/**
 * Check if timer has expired
 */
export function isTimerExpired(draft: DraftManagement): boolean {
	if (draft.status !== 'in_progress') {
		return false;
	}
	return getTimerRemaining(draft) <= 0;
}

/**
 * Get the best available pick for auto-pick
 */
export function getAutoPick(draft: DraftManagement): DraftGolfer | null {
	if (draft.status !== 'in_progress') {
		return null;
	}

	const teamComp = draft.team_compositions[draft.current_drafter];
	if (!teamComp) {
		return null;
	}

	// Get available golfers
	let available = draft.available_golfers.filter(g => !g.drafted);

	// Apply gender filter for rounds 3-4
	if (draft.current_round >= 3) {
		const { male_count, female_count } = teamComp;
		const targetMales = 2;
		const targetFemales = 2;

		if (male_count >= targetMales) {
			const females = available.filter(g => g.gender === 'female');
			if (females.length > 0) available = females;
		} else if (female_count >= targetFemales) {
			const males = available.filter(g => g.gender === 'male');
			if (males.length > 0) available = males;
		}
	}

	if (available.length === 0) {
		return null;
	}

	// Sort by ranking and return best
	available.sort((a, b) => (a.ranking ?? DEFAULT_RANKING) - (b.ranking ?? DEFAULT_RANKING));
	return available[0];
}

/**
 * Validate draft management state
 */
export function validateDraftManagement(draft: DraftManagement): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!TIMER_OPTIONS.includes(draft.timer_duration)) {
		errors.push(`Invalid timer duration: ${draft.timer_duration}`);
	}

	if (draft.draft_order.length !== 6) {
		errors.push(`Draft order must have 6 participants, got ${draft.draft_order.length}`);
	}

	if (draft.available_golfers.length !== 24) {
		errors.push(`Must have 24 golfers, got ${draft.available_golfers.length}`);
	}

	const maleCount = draft.available_golfers.filter(g => g.gender === 'male').length;
	const femaleCount = draft.available_golfers.filter(g => g.gender === 'female').length;
	if (maleCount !== 12 || femaleCount !== 12) {
		errors.push(`Must have 12 male and 12 female golfers, got ${maleCount} male and ${femaleCount} female`);
	}

	if (draft.current_round < 1 || draft.current_round > 4) {
		errors.push(`Invalid round: ${draft.current_round}`);
	}

	if (draft.current_pick < 0 || draft.current_pick > 5) {
		errors.push(`Invalid pick: ${draft.current_pick}`);
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Get draft summary for display
 */
export function getDraftSummary(draft: DraftManagement): {
	status: DraftStatus;
	totalPicks: number;
	picksRemaining: number;
	currentRound: number;
	currentDrafter: string;
	timerRemaining: number;
	isComplete: boolean;
} {
	const totalPicks = draft.pick_history.length;
	const picksRemaining = 24 - totalPicks;

	return {
		status: draft.status,
		totalPicks,
		picksRemaining,
		currentRound: draft.current_round,
		currentDrafter: draft.current_drafter,
		timerRemaining: getTimerRemaining(draft),
		isComplete: draft.status === 'completed'
	};
}
