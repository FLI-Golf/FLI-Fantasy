import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { FantasyLeagueService } from '$lib/services/fantasyLeagueService';
import { createServerPocketBase } from '$lib/pocketbase.server';
import {
	createDraftManagement,
	startDraft,
	pauseDraft,
	resumeDraft,
	resetDraft,
	undoLastPick,
	makePick,
	getAutoPick,
	type DraftManagement
} from '$lib/draft/draftManagement';
import type { DraftGolfer } from '$lib/draft/draftUtils';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const pb = createServerPocketBase();
	const allCookies = cookies.getAll();
	const cookieString = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');

	pb.authStore.loadFromCookie(cookieString);

	if (!pb.authStore.isValid) {
		throw redirect(302, '/');
	}

	const leagueId = params.id;
	const userId = pb.authStore.model?.id;

	try {
		const leagueService = new FantasyLeagueService(pb);

		// Get league data
		const league = await pb.collection('fantasy_league').getOne(leagueId, {
			expand: 'league_owner,fantasy_tournaments'
		});

		// Check if user is owner or participant
		const isOwner = league.league_owner === userId;
		const participants = await leagueService.getLeagueParticipants(leagueId);
		const approvedParticipants = participants.filter((p) => p.status === 'approved');
		const isParticipant = participants.some((p) => p.user === userId && p.status === 'approved');

		if (!isOwner && !isParticipant) {
			throw redirect(302, `/fantasyleagues/${leagueId}`);
		}

		// Get fantasy tournament (first one for now)
		const fantasyTournaments = league.expand?.fantasy_tournaments || [];
		const currentTournament = fantasyTournaments[0];

		if (!currentTournament) {
			return {
				league,
				isOwner,
				currentUser: pb.authStore.model,
				participants: approvedParticipants,
				draftManagement: null,
				golfers: [],
				error: 'No tournament available for draft'
			};
		}

		// Get or initialize draft management
		// Note: DB field has typo 'draft_managment' (missing 'e')
		let draftManagement: DraftManagement | null = currentTournament.draft_managment || null;

		// Get golfers for the draft
		let golfers: DraftGolfer[] = [];
		try {
			// Get non-reserve teams
			const teams = await pb.collection('teams').getFullList({
				filter: 'reserves = false'
			});

			// Collect golfer IDs from teams (male_golfer and female_golfer fields)
			const golferIds: string[] = [];
			const golferTeamMap: Record<string, string> = {};
			
			teams.forEach((team) => {
				if (team.male_golfer) {
					golferIds.push(team.male_golfer);
					golferTeamMap[team.male_golfer] = team.name;
				}
				if (team.female_golfer) {
					golferIds.push(team.female_golfer);
					golferTeamMap[team.female_golfer] = team.name;
				}
			});

			if (golferIds.length > 0) {
				const golfersData = await pb.collection('golfers').getFullList({
					filter: golferIds.map((id) => `id = "${id}"`).join(' || '),
					sort: 'world_ranking'
				});

				golfers = golfersData.map((g) => ({
					id: g.id,
					name: g.name,
					team: golferTeamMap[g.id] || '',
					team_id: '',
					gender: g.gender?.toLowerCase() as 'male' | 'female',
					ranking: g.world_ranking || 999,
					drafted: false,
					drafted_by: null
				}));
			}
		} catch (error) {
			console.error('Error fetching golfers:', error);
		}

		// Expand user details for participants
		const participantsWithUsers = await Promise.all(
			approvedParticipants.map(async (p) => {
				try {
					const user = await pb.collection('users').getOne(p.user);
					return { ...p, expand: { user } };
				} catch (error) {
					return p;
				}
			})
		);

		return {
			league,
			isOwner,
			currentUser: pb.authStore.model,
			participants: participantsWithUsers,
			draftManagement,
			golfers,
			tournamentId: currentTournament.id,
			tournamentName: currentTournament.name || currentTournament.title
		};
	} catch (error) {
		console.error('Error loading draft page:', error);
		throw error;
	}
};

export const actions: Actions = {
	// Initialize draft with settings
	initDraft: async ({ request, cookies, params }) => {
		console.log('🎯 INIT DRAFT ACTION TRIGGERED');
		
		const pb = createServerPocketBase();
		const allCookies = cookies.getAll();
		const cookieString = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');
		pb.authStore.loadFromCookie(cookieString);

		console.log('Auth valid:', pb.authStore.isValid);
		console.log('User ID:', pb.authStore.model?.id);

		if (!pb.authStore.isValid) {
			console.log('❌ Unauthorized');
			return fail(401, { error: 'Unauthorized' });
		}

		const userId = pb.authStore.model?.id;
		const formData = await request.formData();
		const timerDuration = parseInt(formData.get('timerDuration') as string) || 7;
		const tournamentId = formData.get('tournamentId') as string;

		console.log('Timer duration:', timerDuration);
		console.log('Tournament ID:', tournamentId);
		console.log('League ID:', params.id);

		try {
			// Verify owner
			console.log('📋 Fetching league...');
			const league = await pb.collection('fantasy_league').getOne(params.id);
			console.log('League owner:', league.league_owner);
			
			if (league.league_owner !== userId) {
				console.log('❌ Not owner');
				return fail(403, { error: 'Only league owner can initialize draft' });
			}

			// Get approved participants
			console.log('📋 Fetching participants...');
			const participants = await pb.collection('fantasy_season_participants').getFullList({
				filter: `league = "${params.id}" && status = "approved"`
			});
			console.log('Approved participants:', participants.length);

			if (participants.length !== 6) {
				console.log('❌ Wrong participant count');
				return fail(400, { error: `Need exactly 6 approved participants, have ${participants.length}` });
			}

			// Get golfers from non-reserve teams
			console.log('📋 Fetching teams...');
			const teams = await pb.collection('teams').getFullList({
				filter: 'reserves = false'
			});
			console.log('Non-reserve teams:', teams.length);

			// Collect golfer IDs from teams (male_golfer and female_golfer fields)
			const golferIds: string[] = [];
			const golferTeamMap: Record<string, string> = {};
			
			teams.forEach((team) => {
				if (team.male_golfer) {
					golferIds.push(team.male_golfer);
					golferTeamMap[team.male_golfer] = team.name;
				}
				if (team.female_golfer) {
					golferIds.push(team.female_golfer);
					golferTeamMap[team.female_golfer] = team.name;
				}
			});
			console.log('Golfer IDs collected:', golferIds.length);

			if (golferIds.length !== 24) {
				console.log('❌ Wrong golfer count');
				return fail(400, { error: `Need exactly 24 golfers, have ${golferIds.length}` });
			}

			console.log('📋 Fetching golfers...');
			const golfersData = await pb.collection('golfers').getFullList({
				filter: golferIds.map((id) => `id = "${id}"`).join(' || '),
				sort: 'world_ranking'
			});
			console.log('Golfers fetched:', golfersData.length);

			const golfers: DraftGolfer[] = golfersData.map((g) => ({
				id: g.id,
				name: g.name,
				team: golferTeamMap[g.id] || '',
				team_id: '',
				gender: g.gender?.toLowerCase() as 'male' | 'female',
				ranking: g.world_ranking || 999,
				drafted: false,
				drafted_by: null
			}));

			// Shuffle participant order for draft
			const participantIds = participants.map((p) => p.user);
			const shuffledOrder = [...participantIds].sort(() => Math.random() - 0.5);
			console.log('Shuffled order:', shuffledOrder);

			// Create draft management
			console.log('📋 Creating draft management...');
			const draftManagement = createDraftManagement(
				shuffledOrder,
				golfers,
				timerDuration as 7 | 15 | 30 | 45
			);
			console.log('Draft management created');

			// Save to fantasy tournament
			// Note: DB field has typo 'draft_managment' (missing 'e')
			console.log('📋 Saving to fantasy tournament:', tournamentId);
			await pb.collection('fantasy_tournament').update(tournamentId, {
				draft_managment: draftManagement,
				draft_order: shuffledOrder
			});

			console.log('✅ Draft initialized successfully');
			return { success: true, action: 'draft_initialized' };
		} catch (error: any) {
			console.error('❌ Error initializing draft:', error);
			console.error('Error message:', error.message);
			console.error('Error data:', error.data);
			return fail(500, { error: error.message || 'Failed to initialize draft' });
		}
	},

	// Start the draft
	startDraft: async ({ request, cookies, params }) => {
		const pb = createServerPocketBase();
		const allCookies = cookies.getAll();
		const cookieString = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');
		pb.authStore.loadFromCookie(cookieString);

		if (!pb.authStore.isValid) {
			return fail(401, { error: 'Unauthorized' });
		}

		const userId = pb.authStore.model?.id;
		const formData = await request.formData();
		const tournamentId = formData.get('tournamentId') as string;

		try {
			const league = await pb.collection('fantasy_league').getOne(params.id);
			if (league.league_owner !== userId) {
				return fail(403, { error: 'Only league owner can start draft' });
			}

			const tournament = await pb.collection('fantasy_tournament').getOne(tournamentId);
			if (!tournament.draft_managment) {
				return fail(400, { error: 'Draft not initialized' });
			}

			const updatedDraft = startDraft(tournament.draft_managment);
			if (updatedDraft.last_error) {
				return fail(400, { error: updatedDraft.last_error });
			}

			await pb.collection('fantasy_tournament').update(tournamentId, {
				draft_managment: updatedDraft
			});

			return { success: true, action: 'draft_started' };
		} catch (error: any) {
			console.error('Error starting draft:', error);
			return fail(500, { error: error.message || 'Failed to start draft' });
		}
	},

	// Pause the draft
	pauseDraft: async ({ request, cookies, params }) => {
		const pb = createServerPocketBase();
		const allCookies = cookies.getAll();
		const cookieString = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');
		pb.authStore.loadFromCookie(cookieString);

		if (!pb.authStore.isValid) {
			return fail(401, { error: 'Unauthorized' });
		}

		const userId = pb.authStore.model?.id;
		const formData = await request.formData();
		const tournamentId = formData.get('tournamentId') as string;

		try {
			const league = await pb.collection('fantasy_league').getOne(params.id);
			if (league.league_owner !== userId) {
				return fail(403, { error: 'Only league owner can pause draft' });
			}

			const tournament = await pb.collection('fantasy_tournament').getOne(tournamentId);
			const updatedDraft = pauseDraft(tournament.draft_managment);

			if (updatedDraft.last_error) {
				return fail(400, { error: updatedDraft.last_error });
			}

			await pb.collection('fantasy_tournament').update(tournamentId, {
				draft_managment: updatedDraft
			});

			return { success: true, action: 'draft_paused' };
		} catch (error: any) {
			console.error('Error pausing draft:', error);
			return fail(500, { error: error.message || 'Failed to pause draft' });
		}
	},

	// Resume the draft
	resumeDraft: async ({ request, cookies, params }) => {
		const pb = createServerPocketBase();
		const allCookies = cookies.getAll();
		const cookieString = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');
		pb.authStore.loadFromCookie(cookieString);

		if (!pb.authStore.isValid) {
			return fail(401, { error: 'Unauthorized' });
		}

		const userId = pb.authStore.model?.id;
		const formData = await request.formData();
		const tournamentId = formData.get('tournamentId') as string;

		try {
			const league = await pb.collection('fantasy_league').getOne(params.id);
			if (league.league_owner !== userId) {
				return fail(403, { error: 'Only league owner can resume draft' });
			}

			const tournament = await pb.collection('fantasy_tournament').getOne(tournamentId);
			const updatedDraft = resumeDraft(tournament.draft_managment);

			if (updatedDraft.last_error) {
				return fail(400, { error: updatedDraft.last_error });
			}

			await pb.collection('fantasy_tournament').update(tournamentId, {
				draft_managment: updatedDraft
			});

			return { success: true, action: 'draft_resumed' };
		} catch (error: any) {
			console.error('Error resuming draft:', error);
			return fail(500, { error: error.message || 'Failed to resume draft' });
		}
	},

	// Reset the draft
	resetDraft: async ({ request, cookies, params }) => {
		const pb = createServerPocketBase();
		const allCookies = cookies.getAll();
		const cookieString = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');
		pb.authStore.loadFromCookie(cookieString);

		if (!pb.authStore.isValid) {
			return fail(401, { error: 'Unauthorized' });
		}

		const userId = pb.authStore.model?.id;
		const formData = await request.formData();
		const tournamentId = formData.get('tournamentId') as string;

		try {
			const league = await pb.collection('fantasy_league').getOne(params.id);
			if (league.league_owner !== userId) {
				return fail(403, { error: 'Only league owner can reset draft' });
			}

			const tournament = await pb.collection('fantasy_tournament').getOne(tournamentId);
			const updatedDraft = resetDraft(tournament.draft_managment);

			await pb.collection('fantasy_tournament').update(tournamentId, {
				draft_managment: updatedDraft
			});

			return { success: true, action: 'draft_reset' };
		} catch (error: any) {
			console.error('Error resetting draft:', error);
			return fail(500, { error: error.message || 'Failed to reset draft' });
		}
	},

	// Undo last pick
	undoPick: async ({ request, cookies, params }) => {
		const pb = createServerPocketBase();
		const allCookies = cookies.getAll();
		const cookieString = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');
		pb.authStore.loadFromCookie(cookieString);

		if (!pb.authStore.isValid) {
			return fail(401, { error: 'Unauthorized' });
		}

		const userId = pb.authStore.model?.id;
		const formData = await request.formData();
		const tournamentId = formData.get('tournamentId') as string;

		try {
			const league = await pb.collection('fantasy_league').getOne(params.id);
			if (league.league_owner !== userId) {
				return fail(403, { error: 'Only league owner can undo picks' });
			}

			const tournament = await pb.collection('fantasy_tournament').getOne(tournamentId);
			const updatedDraft = undoLastPick(tournament.draft_managment);

			if (updatedDraft.last_error) {
				return fail(400, { error: updatedDraft.last_error });
			}

			await pb.collection('fantasy_tournament').update(tournamentId, {
				draft_managment: updatedDraft
			});

			return { success: true, action: 'pick_undone' };
		} catch (error: any) {
			console.error('Error undoing pick:', error);
			return fail(500, { error: error.message || 'Failed to undo pick' });
		}
	},

	// Make a pick
	makePick: async ({ request, cookies, params }) => {
		const pb = createServerPocketBase();
		const allCookies = cookies.getAll();
		const cookieString = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');
		pb.authStore.loadFromCookie(cookieString);

		if (!pb.authStore.isValid) {
			return fail(401, { error: 'Unauthorized' });
		}

		const userId = pb.authStore.model?.id;
		const formData = await request.formData();
		const tournamentId = formData.get('tournamentId') as string;
		const golferId = formData.get('golferId') as string;

		try {
			const tournament = await pb.collection('fantasy_tournament').getOne(tournamentId);
			const draft = tournament.draft_managment as DraftManagement;

			if (!draft) {
				return fail(400, { error: 'Draft not initialized' });
			}

			// Verify it's the user's turn
			if (draft.current_drafter !== userId) {
				return fail(403, { error: 'It is not your turn to pick' });
			}

			const updatedDraft = makePick(draft, userId, golferId, false);

			if (updatedDraft.last_error) {
				return fail(400, { error: updatedDraft.last_error });
			}

			await pb.collection('fantasy_tournament').update(tournamentId, {
				draft_managment: updatedDraft
			});

			return { success: true, action: 'pick_made' };
		} catch (error: any) {
			console.error('Error making pick:', error);
			return fail(500, { error: error.message || 'Failed to make pick' });
		}
	},

	// Auto-pick (for timer expiry)
	autoPick: async ({ request, cookies, params }) => {
		const pb = createServerPocketBase();
		const allCookies = cookies.getAll();
		const cookieString = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');
		pb.authStore.loadFromCookie(cookieString);

		if (!pb.authStore.isValid) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const tournamentId = formData.get('tournamentId') as string;

		try {
			const tournament = await pb.collection('fantasy_tournament').getOne(tournamentId);
			const draft = tournament.draft_managment as DraftManagement;

			if (!draft || draft.status !== 'in_progress') {
				return fail(400, { error: 'Draft not in progress' });
			}

			const autoPick = getAutoPick(draft);
			if (!autoPick) {
				return fail(400, { error: 'No valid auto-pick available' });
			}

			const updatedDraft = makePick(draft, draft.current_drafter, autoPick.id, true);

			if (updatedDraft.last_error) {
				return fail(400, { error: updatedDraft.last_error });
			}

			await pb.collection('fantasy_tournament').update(tournamentId, {
				draft_managment: updatedDraft
			});

			return { success: true, action: 'auto_pick_made', golferId: autoPick.id };
		} catch (error: any) {
			console.error('Error auto-picking:', error);
			return fail(500, { error: error.message || 'Failed to auto-pick' });
		}
	}
};
