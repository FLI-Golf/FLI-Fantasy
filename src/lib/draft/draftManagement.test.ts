import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createDraftManagement,
	startDraft,
	pauseDraft,
	resumeDraft,
	resetDraft,
	undoLastPick,
	makePick,
	getTimerRemaining,
	isTimerExpired,
	getAutoPick,
	validateDraftManagement,
	getDraftSummary,
	type DraftManagement
} from './draftManagement';
import {
	mockParticipants,
	createMockGolfers
} from '../../test/fixtures/draft';

describe('Draft Management', () => {
	let golfers: ReturnType<typeof createMockGolfers>;
	let draft: DraftManagement;

	beforeEach(() => {
		golfers = createMockGolfers();
		draft = createDraftManagement(mockParticipants, golfers, 7);
	});

	describe('createDraftManagement', () => {
		it('should create initial draft state with pending status', () => {
			expect(draft.status).toBe('pending');
			expect(draft.timer_duration).toBe(7);
			expect(draft.total_rounds).toBe(4);
			expect(draft.total_participants).toBe(6);
		});

		it('should set draft order from participants', () => {
			expect(draft.draft_order).toEqual(mockParticipants);
			expect(draft.current_drafter).toBe('user_alice');
		});

		it('should initialize all golfers as undrafted', () => {
			expect(draft.available_golfers).toHaveLength(24);
			expect(draft.available_golfers.every(g => !g.drafted)).toBe(true);
		});

		it('should initialize empty team compositions for all participants', () => {
			mockParticipants.forEach(userId => {
				expect(draft.team_compositions[userId]).toBeDefined();
				expect(draft.team_compositions[userId].total_picks).toBe(0);
				expect(draft.team_compositions[userId].fantasy_team).toHaveLength(0);
			});
		});

		it('should set default ranking for golfers without ranking', () => {
			const golfersWithoutRanking = golfers.map(g => ({ ...g, ranking: undefined }));
			const draftNoRanking = createDraftManagement(mockParticipants, golfersWithoutRanking, 7);
			
			draftNoRanking.available_golfers.forEach(g => {
				expect(g.ranking).toBe(999);
			});
		});

		it('should accept different timer durations', () => {
			const draft7 = createDraftManagement(mockParticipants, golfers, 7);
			const draft15 = createDraftManagement(mockParticipants, golfers, 15);
			const draft30 = createDraftManagement(mockParticipants, golfers, 30);
			const draft45 = createDraftManagement(mockParticipants, golfers, 45);

			expect(draft7.timer_duration).toBe(7);
			expect(draft15.timer_duration).toBe(15);
			expect(draft30.timer_duration).toBe(30);
			expect(draft45.timer_duration).toBe(45);
		});
	});

	describe('startDraft', () => {
		it('should start draft from pending status', () => {
			const started = startDraft(draft);

			expect(started.status).toBe('in_progress');
			expect(started.started_at).not.toBeNull();
			expect(started.timer_started_at).not.toBeNull();
			expect(started.last_error).toBeNull();
		});

		it('should not start draft if not pending', () => {
			draft.status = 'in_progress';
			const result = startDraft(draft);

			expect(result.status).toBe('in_progress');
			expect(result.last_error).toBe('Draft can only be started from pending status');
		});

		it('should not start draft without 6 participants', () => {
			draft.draft_order = ['user_1', 'user_2']; // Only 2
			const result = startDraft(draft);

			expect(result.last_error).toBe('Draft requires exactly 6 participants');
		});

		it('should not start draft without 24 golfers', () => {
			draft.available_golfers = draft.available_golfers.slice(0, 10);
			const result = startDraft(draft);

			expect(result.last_error).toBe('Draft requires exactly 24 golfers');
		});
	});

	describe('pauseDraft', () => {
		it('should pause an in-progress draft', () => {
			draft = startDraft(draft);
			const paused = pauseDraft(draft);

			expect(paused.status).toBe('paused');
			expect(paused.timer_paused_at).not.toBeNull();
			expect(paused.timer_remaining_ms).toBeGreaterThanOrEqual(0);
		});

		it('should not pause a non-in-progress draft', () => {
			const result = pauseDraft(draft); // Still pending

			expect(result.last_error).toBe('Can only pause an in-progress draft');
		});

		it('should preserve remaining time when paused', () => {
			draft = startDraft(draft);
			// Simulate some time passing
			const startTime = new Date(draft.timer_started_at!);
			draft.timer_started_at = new Date(startTime.getTime() - 3000).toISOString(); // 3 seconds ago

			const paused = pauseDraft(draft);

			// Should have ~4 seconds remaining (7 - 3)
			expect(paused.timer_remaining_ms).toBeLessThanOrEqual(4000);
			expect(paused.timer_remaining_ms).toBeGreaterThan(0);
		});
	});

	describe('resumeDraft', () => {
		it('should resume a paused draft', () => {
			draft = startDraft(draft);
			draft = pauseDraft(draft);
			const resumed = resumeDraft(draft);

			expect(resumed.status).toBe('in_progress');
			expect(resumed.timer_paused_at).toBeNull();
			expect(resumed.timer_remaining_ms).toBeNull();
			expect(resumed.timer_started_at).not.toBeNull();
		});

		it('should not resume a non-paused draft', () => {
			draft = startDraft(draft);
			const result = resumeDraft(draft);

			expect(result.last_error).toBe('Can only resume a paused draft');
		});

		it('should preserve remaining time when resumed', () => {
			draft = startDraft(draft);
			draft.timer_started_at = new Date(Date.now() - 3000).toISOString();
			draft = pauseDraft(draft);
			
			const remainingBefore = draft.timer_remaining_ms!;
			const resumed = resumeDraft(draft);
			const remainingAfter = getTimerRemaining(resumed);

			// Should be approximately the same (within 100ms tolerance)
			expect(Math.abs(remainingAfter - remainingBefore)).toBeLessThan(100);
		});
	});

	describe('resetDraft', () => {
		it('should reset draft to pending state', () => {
			draft = startDraft(draft);
			// Make some picks
			draft = makePick(draft, 'user_alice', 'male_01');
			draft = makePick(draft, 'user_bob', 'female_01');

			const reset = resetDraft(draft);

			expect(reset.status).toBe('pending');
			expect(reset.current_round).toBe(1);
			expect(reset.current_pick).toBe(0);
			expect(reset.current_drafter).toBe('user_alice');
			expect(reset.pick_history).toHaveLength(0);
			expect(reset.started_at).toBeNull();
		});

		it('should reset all golfers to undrafted', () => {
			draft = startDraft(draft);
			draft = makePick(draft, 'user_alice', 'male_01');

			const reset = resetDraft(draft);

			expect(reset.available_golfers.every(g => !g.drafted)).toBe(true);
		});

		it('should reset all team compositions', () => {
			draft = startDraft(draft);
			draft = makePick(draft, 'user_alice', 'male_01');

			const reset = resetDraft(draft);

			mockParticipants.forEach(userId => {
				expect(reset.team_compositions[userId].total_picks).toBe(0);
				expect(reset.team_compositions[userId].fantasy_team).toHaveLength(0);
			});
		});

		it('should preserve draft order after reset', () => {
			draft = startDraft(draft);
			const originalOrder = [...draft.draft_order];

			const reset = resetDraft(draft);

			expect(reset.draft_order).toEqual(originalOrder);
		});
	});

	describe('undoLastPick', () => {
		beforeEach(() => {
			draft = startDraft(draft);
		});

		it('should undo the last pick', () => {
			draft = makePick(draft, 'user_alice', 'male_01');
			expect(draft.pick_history).toHaveLength(1);

			const undone = undoLastPick(draft);

			expect(undone.pick_history).toHaveLength(0);
			expect(undone.current_drafter).toBe('user_alice');
			expect(undone.current_round).toBe(1);
			expect(undone.current_pick).toBe(0);
		});

		it('should restore golfer to available', () => {
			draft = makePick(draft, 'user_alice', 'male_01');
			expect(draft.available_golfers.find(g => g.id === 'male_01')?.drafted).toBe(true);

			const undone = undoLastPick(draft);

			expect(undone.available_golfers.find(g => g.id === 'male_01')?.drafted).toBe(false);
		});

		it('should update team composition', () => {
			draft = makePick(draft, 'user_alice', 'male_01');
			expect(draft.team_compositions['user_alice'].male_count).toBe(1);

			const undone = undoLastPick(draft);

			expect(undone.team_compositions['user_alice'].male_count).toBe(0);
			expect(undone.team_compositions['user_alice'].total_picks).toBe(0);
		});

		it('should return error if no picks to undo', () => {
			const result = undoLastPick(draft);

			expect(result.last_error).toBe('No picks to undo');
		});

		it('should allow undo from completed draft', () => {
			// Make all 24 picks
			for (let i = 0; i < 24; i++) {
				const drafter = draft.current_drafter;
				const available = draft.available_golfers.filter(g => !g.drafted);
				draft = makePick(draft, drafter, available[0].id);
			}
			expect(draft.status).toBe('completed');

			const undone = undoLastPick(draft);

			expect(undone.status).toBe('paused'); // Goes to paused, not in_progress
			expect(undone.pick_history).toHaveLength(23);
		});

		it('should undo multiple picks in sequence', () => {
			draft = makePick(draft, 'user_alice', 'male_01');
			draft = makePick(draft, 'user_bob', 'female_01');
			draft = makePick(draft, 'user_charlie', 'male_02');

			draft = undoLastPick(draft);
			expect(draft.current_drafter).toBe('user_charlie');

			draft = undoLastPick(draft);
			expect(draft.current_drafter).toBe('user_bob');

			draft = undoLastPick(draft);
			expect(draft.current_drafter).toBe('user_alice');
			expect(draft.pick_history).toHaveLength(0);
		});
	});

	describe('makePick', () => {
		beforeEach(() => {
			draft = startDraft(draft);
		});

		it('should make a valid pick', () => {
			const result = makePick(draft, 'user_alice', 'male_01');

			expect(result.last_error).toBeNull();
			expect(result.pick_history).toHaveLength(1);
			expect(result.pick_history[0].golfer_id).toBe('male_01');
			expect(result.pick_history[0].user_id).toBe('user_alice');
		});

		it('should update golfer as drafted', () => {
			const result = makePick(draft, 'user_alice', 'male_01');

			const golfer = result.available_golfers.find(g => g.id === 'male_01');
			expect(golfer?.drafted).toBe(true);
			expect(golfer?.drafted_by).toBe('user_alice');
		});

		it('should update team composition', () => {
			const result = makePick(draft, 'user_alice', 'male_01');

			expect(result.team_compositions['user_alice'].male_count).toBe(1);
			expect(result.team_compositions['user_alice'].total_picks).toBe(1);
			expect(result.team_compositions['user_alice'].fantasy_team).toHaveLength(1);
		});

		it('should advance to next drafter', () => {
			const result = makePick(draft, 'user_alice', 'male_01');

			expect(result.current_drafter).toBe('user_bob');
			expect(result.current_pick).toBe(1);
		});

		it('should reject pick if not user turn', () => {
			const result = makePick(draft, 'user_bob', 'male_01');

			expect(result.last_error).toBe('It is not your turn to pick');
		});

		it('should reject pick of already drafted golfer', () => {
			draft = makePick(draft, 'user_alice', 'male_01');
			const result = makePick(draft, 'user_bob', 'male_01');

			expect(result.last_error).toBe('Golfer has already been drafted');
		});

		it('should reject pick of non-existent golfer', () => {
			const result = makePick(draft, 'user_alice', 'invalid_id');

			expect(result.last_error).toBe('Golfer not found');
		});

		it('should reject pick if draft not in progress', () => {
			draft.status = 'paused';
			const result = makePick(draft, 'user_alice', 'male_01');

			expect(result.last_error).toBe('Draft is not in progress');
		});

		it('should track auto-pick flag', () => {
			const result = makePick(draft, 'user_alice', 'male_01', true);

			expect(result.pick_history[0].was_auto_pick).toBe(true);
		});

		it('should complete draft after 24 picks', () => {
			// Make all 24 picks
			for (let i = 0; i < 24; i++) {
				const drafter = draft.current_drafter;
				const available = draft.available_golfers.filter(g => !g.drafted);
				draft = makePick(draft, drafter, available[0].id);
			}

			expect(draft.status).toBe('completed');
			expect(draft.completed_at).not.toBeNull();
			expect(draft.pick_history).toHaveLength(24);
		});

		it('should follow snake draft order', () => {
			// Round 1: Alice, Bob, Charlie, Diana, Eve, Frank
			const round1Drafters: string[] = [];
			for (let i = 0; i < 6; i++) {
				round1Drafters.push(draft.current_drafter);
				const available = draft.available_golfers.filter(g => !g.drafted);
				draft = makePick(draft, draft.current_drafter, available[0].id);
			}

			expect(round1Drafters).toEqual([
				'user_alice', 'user_bob', 'user_charlie',
				'user_diana', 'user_eve', 'user_frank'
			]);

			// Round 2: Frank, Eve, Diana, Charlie, Bob, Alice
			const round2Drafters: string[] = [];
			for (let i = 0; i < 6; i++) {
				round2Drafters.push(draft.current_drafter);
				const available = draft.available_golfers.filter(g => !g.drafted);
				draft = makePick(draft, draft.current_drafter, available[0].id);
			}

			expect(round2Drafters).toEqual([
				'user_frank', 'user_eve', 'user_diana',
				'user_charlie', 'user_bob', 'user_alice'
			]);
		});
	});

	describe('Timer Functions', () => {
		beforeEach(() => {
			draft = startDraft(draft);
		});

		it('should return full time at start', () => {
			const remaining = getTimerRemaining(draft);
			// Should be close to 7000ms (within 100ms tolerance)
			expect(remaining).toBeGreaterThan(6900);
			expect(remaining).toBeLessThanOrEqual(7000);
		});

		it('should return 0 if not in progress', () => {
			draft.status = 'pending';
			expect(getTimerRemaining(draft)).toBe(0);
		});

		it('should return remaining time when paused', () => {
			draft.timer_started_at = new Date(Date.now() - 3000).toISOString();
			draft = pauseDraft(draft);

			const remaining = getTimerRemaining(draft);
			expect(remaining).toBeGreaterThan(3900);
			expect(remaining).toBeLessThanOrEqual(4000);
		});

		it('should detect expired timer', () => {
			draft.timer_started_at = new Date(Date.now() - 10000).toISOString(); // 10 seconds ago

			expect(isTimerExpired(draft)).toBe(true);
		});

		it('should not be expired if time remains', () => {
			expect(isTimerExpired(draft)).toBe(false);
		});

		it('should not be expired if not in progress', () => {
			draft.status = 'paused';
			draft.timer_started_at = new Date(Date.now() - 10000).toISOString();

			expect(isTimerExpired(draft)).toBe(false);
		});
	});

	describe('getAutoPick', () => {
		beforeEach(() => {
			draft = startDraft(draft);
		});

		it('should return best ranked available golfer', () => {
			const autoPick = getAutoPick(draft);

			expect(autoPick).not.toBeNull();
			expect(autoPick?.ranking).toBe(1);
		});

		it('should return null if not in progress', () => {
			draft.status = 'paused';
			expect(getAutoPick(draft)).toBeNull();
		});

		it('should respect gender filter in round 3', () => {
			// Simulate Alice having 2 males after round 2
			draft.current_round = 3;
			draft.team_compositions['user_alice'] = {
				male_count: 2,
				female_count: 0,
				total_picks: 2,
				fantasy_team: []
			};

			const autoPick = getAutoPick(draft);

			expect(autoPick?.gender).toBe('female');
		});

		it('should skip drafted golfers', () => {
			// Draft top ranked golfers
			draft.available_golfers.find(g => g.id === 'male_01')!.drafted = true;
			draft.available_golfers.find(g => g.id === 'female_01')!.drafted = true;

			const autoPick = getAutoPick(draft);

			expect(autoPick?.ranking).toBe(2);
		});
	});

	describe('validateDraftManagement', () => {
		it('should validate correct draft state', () => {
			const result = validateDraftManagement(draft);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject invalid timer duration', () => {
			draft.timer_duration = 10 as any;
			const result = validateDraftManagement(draft);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Invalid timer duration: 10');
		});

		it('should reject wrong number of participants', () => {
			draft.draft_order = ['user_1', 'user_2'];
			const result = validateDraftManagement(draft);

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('6 participants'))).toBe(true);
		});

		it('should reject wrong number of golfers', () => {
			draft.available_golfers = draft.available_golfers.slice(0, 20);
			const result = validateDraftManagement(draft);

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('24 golfers'))).toBe(true);
		});

		it('should reject unbalanced genders', () => {
			// Make all golfers male
			draft.available_golfers = draft.available_golfers.map(g => ({ ...g, gender: 'male' as const }));
			const result = validateDraftManagement(draft);

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('12 male and 12 female'))).toBe(true);
		});
	});

	describe('getDraftSummary', () => {
		it('should return correct summary for pending draft', () => {
			const summary = getDraftSummary(draft);

			expect(summary.status).toBe('pending');
			expect(summary.totalPicks).toBe(0);
			expect(summary.picksRemaining).toBe(24);
			expect(summary.currentRound).toBe(1);
			expect(summary.isComplete).toBe(false);
		});

		it('should return correct summary during draft', () => {
			draft = startDraft(draft);
			draft = makePick(draft, 'user_alice', 'male_01');
			draft = makePick(draft, 'user_bob', 'female_01');

			const summary = getDraftSummary(draft);

			expect(summary.status).toBe('in_progress');
			expect(summary.totalPicks).toBe(2);
			expect(summary.picksRemaining).toBe(22);
		});

		it('should return correct summary for completed draft', () => {
			draft = startDraft(draft);
			for (let i = 0; i < 24; i++) {
				const available = draft.available_golfers.filter(g => !g.drafted);
				draft = makePick(draft, draft.current_drafter, available[0].id);
			}

			const summary = getDraftSummary(draft);

			expect(summary.status).toBe('completed');
			expect(summary.totalPicks).toBe(24);
			expect(summary.picksRemaining).toBe(0);
			expect(summary.isComplete).toBe(true);
		});
	});

	describe('Full Draft Simulation', () => {
		it('should complete a full draft with all teams having 2+2 balance', () => {
			draft = startDraft(draft);

			// Simulate full draft with auto-picks
			while (draft.status === 'in_progress') {
				const autoPick = getAutoPick(draft);
				expect(autoPick).not.toBeNull();
				draft = makePick(draft, draft.current_drafter, autoPick!.id, true);
			}

			expect(draft.status).toBe('completed');
			expect(draft.pick_history).toHaveLength(24);

			// Verify each team has 2 males + 2 females
			mockParticipants.forEach(userId => {
				const team = draft.team_compositions[userId];
				expect(team.total_picks).toBe(4);
				expect(team.male_count).toBe(2);
				expect(team.female_count).toBe(2);
			});
		});

		it('should handle pause/resume during draft', () => {
			draft = startDraft(draft);
			draft = makePick(draft, 'user_alice', 'male_01');

			draft = pauseDraft(draft);
			expect(draft.status).toBe('paused');

			draft = resumeDraft(draft);
			expect(draft.status).toBe('in_progress');

			draft = makePick(draft, 'user_bob', 'female_01');
			expect(draft.pick_history).toHaveLength(2);
		});

		it('should handle reset and restart', () => {
			draft = startDraft(draft);
			draft = makePick(draft, 'user_alice', 'male_01');
			draft = makePick(draft, 'user_bob', 'female_01');

			draft = resetDraft(draft);
			expect(draft.status).toBe('pending');
			expect(draft.pick_history).toHaveLength(0);

			draft = startDraft(draft);
			expect(draft.status).toBe('in_progress');
			expect(draft.current_drafter).toBe('user_alice');
		});
	});
});
