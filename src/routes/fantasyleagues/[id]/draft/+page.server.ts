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

	// The [id] param is the fantasy_tournament ID
	const tournamentId = params.id;
	const userId = pb.authStore.model?.id;

	try {
		// Get the fantasy tournament directly
		const tournament = await pb.collection('fantasy_tournament').getOne(tournamentId, {
			expand: 'fantasy_league'
		});

		// Get the league from the tournament's relation
		const leagueId = tournament.fantasy_league;
		const league = tournament.expand?.fantasy_league || await pb.collection('fantasy_league').getOne(leagueId);

		const leagueService = new FantasyLeagueService(pb);

		// Check if user is owner or participant
		const isOwner = league.league_owner === userId;
		const participants = await leagueService.getLeagueParticipants(leagueId);
		const approvedParticipants = participants.filter((p) => p.status === 'approved');
		const isParticipant = participants.some((p) => p.user === userId && p.status === 'approved');

		if (!isOwner && !isParticipant) {
			throw redirect(302, `/fantasyleagues/${leagueId}`);
		}

		// Get draft management from tournament
		// Note: DB field has typo 'draft_managment' (missing 'e')
		let draftManagement: DraftManagement | null = tournament.draft_managment || null;

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
			leagueId,
			isOwner,
			currentUser: pb.authStore.model,
			participants: participantsWithUsers,
			draftManagement,
			draftOrder: tournament.draft_order || [],
			fantasySettings: tournament.fantasy_settings || {},
			golfers,
			tournamentId: tournament.id,
			tournamentName: tournament.title
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

		if (!pb.authStore.isValid) {
			console.log('❌ Unauthorized');
			return fail(401, { error: 'Unauthorized' });
		}

		const userId = pb.authStore.model?.id;
		const formData = await request.formData();
		const timerDuration = parseInt(formData.get('timerDuration') as string) || 7;
		
		// params.id is the tournament ID
		const tournamentId = params.id;

		try {
			// Get tournament and its league
			const tournament = await pb.collection('fantasy_tournament').getOne(tournamentId);
			const leagueId = tournament.fantasy_league;
			const league = await pb.collection('fantasy_league').getOne(leagueId);
			
			if (league.league_owner !== userId) {
				console.log('❌ Not owner');
				return fail(403, { error: 'Only league owner can initialize draft' });
			}

			// Get approved participants
			const participants = await pb.collection('fantasy_season_participants').getFullList({
				filter: `league = "${leagueId}" && status = "approved"`
			});
			console.log('Approved participants:', participants.length);

			if (participants.length !== 6) {
				console.log('❌ Wrong participant count');
				return fail(400, { error: `Need exactly 6 approved participants, have ${participants.length}` });
			}

			// Get golfers from non-reserve teams
			const teams = await pb.collection('teams').getFullList({
				filter: 'reserves = false'
			});

			// Collect golfer IDs from teams
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

			if (golferIds.length !== 24) {
				console.log('❌ Wrong golfer count');
				return fail(400, { error: `Need exactly 24 golfers, have ${golferIds.length}` });
			}

			const golfersData = await pb.collection('golfers').getFullList({
				filter: golferIds.map((id) => `id = "${id}"`).join(' || '),
				sort: 'world_ranking'
			});

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

			// Create draft management
			const draftManagement = createDraftManagement(
				shuffledOrder,
				golfers,
				timerDuration as 7 | 15 | 30 | 45
			);

			// Save to fantasy tournament
			await pb.collection('fantasy_tournament').update(tournamentId, {
				draft_managment: draftManagement,
				draft_order: shuffledOrder
			});

			console.log('✅ Draft initialized successfully');
			return { success: true, action: 'draft_initialized' };
		} catch (error: any) {
			console.error('❌ Error initializing draft:', error);
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
		const tournamentId = params.id;

		try {
			const tournament = await pb.collection('fantasy_tournament').getOne(tournamentId);
			const league = await pb.collection('fantasy_league').getOne(tournament.fantasy_league);
			
			if (league.league_owner !== userId) {
				return fail(403, { error: 'Only league owner can start draft' });
			}

			if (!tournament.draft_managment) {
				return fail(400, { error: 'Draft not initialized' });
			}

			let draftData = tournament.draft_managment as any;
			
			// Normalize old format to new format if needed
			if (!draftData.status) {
				// Old format has draft_started/draft_completed, convert to status
				if (draftData.draft_completed) {
					draftData.status = 'completed';
				} else if (draftData.draft_started) {
					draftData.status = 'in_progress';
				} else {
					draftData.status = 'pending';
				}
			}
			
			// Ensure all required fields exist
			draftData.draft_order = draftData.draft_order || tournament.draft_order || [];
			draftData.timer_duration = draftData.timer_duration || tournament.fantasy_settings?.pick_duration_seconds || 7;
			draftData.total_rounds = draftData.total_rounds || tournament.fantasy_settings?.rounds || 4;
			draftData.current_round = draftData.current_round || 1;
			draftData.current_pick = draftData.current_pick ?? 0;
			// Handle both field names: current_direction (new) and draft_direction (old)
			draftData.current_direction = draftData.current_direction || draftData.draft_direction || 'down';
			draftData.current_drafter = draftData.current_drafter || draftData.draft_order[0];
			draftData.pick_history = draftData.pick_history || [];
			draftData.team_compositions = draftData.team_compositions || {};
			
			console.log('📋 Draft state before start:');
			console.log('  current_round:', draftData.current_round);
			console.log('  current_pick:', draftData.current_pick);
			console.log('  current_direction:', draftData.current_direction);
			console.log('  current_drafter:', draftData.current_drafter);
			console.log('  draft_order:', draftData.draft_order);
			
			// Initialize team_compositions for each participant if not exists
			for (const oderId of draftData.draft_order) {
				if (!draftData.team_compositions[oderId]) {
					draftData.team_compositions[oderId] = {
						oderId,
						fantasy_team: [],
						male_count: 0,
						female_count: 0,
						total_picks: 0
					};
				}
			}

			// Refresh available_golfers from current golfers collection
			// This ensures any roster changes (injuries, replacements) are reflected
			const teams = await pb.collection('teams').getFullList({
				filter: 'reserves = false'
			});

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

				draftData.available_golfers = golfersData.map((g) => ({
					id: g.id,
					name: g.name,
					team: golferTeamMap[g.id] || '',
					team_id: '',
					gender: g.gender?.toLowerCase() as 'male' | 'female',
					ranking: g.world_ranking || 999,
					drafted: false,
					drafted_by: null
				}));

				console.log(`✅ Refreshed available_golfers with ${draftData.available_golfers.length} golfers`);
			}

			const updatedDraft = startDraft(draftData as DraftManagement);
			if (updatedDraft.last_error) {
				return fail(400, { error: updatedDraft.last_error });
			}

			// Ensure timer_started_at is set
			const now = new Date().toISOString();
			updatedDraft.timer_started_at = now;
			updatedDraft.started_at = now;

			// Update tournament with draft data and set status to in_progress
			await pb.collection('fantasy_tournament').update(tournamentId, {
				draft_managment: updatedDraft,
				status: 'in_progress'
			});

			console.log('Draft started with timer_started_at:', updatedDraft.timer_started_at);
			console.log('Tournament status set to in_progress');
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
		const tournamentId = params.id;

		try {
			const tournament = await pb.collection('fantasy_tournament').getOne(tournamentId);
			const league = await pb.collection('fantasy_league').getOne(tournament.fantasy_league);
			
			if (league.league_owner !== userId) {
				return fail(403, { error: 'Only league owner can pause draft' });
			}

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
		const tournamentId = params.id;

		try {
			const tournament = await pb.collection('fantasy_tournament').getOne(tournamentId);
			const league = await pb.collection('fantasy_league').getOne(tournament.fantasy_league);
			
			if (league.league_owner !== userId) {
				return fail(403, { error: 'Only league owner can resume draft' });
			}

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
		const tournamentId = params.id;

		try {
			const tournament = await pb.collection('fantasy_tournament').getOne(tournamentId);
			const league = await pb.collection('fantasy_league').getOne(tournament.fantasy_league);
			
			if (league.league_owner !== userId) {
				return fail(403, { error: 'Only league owner can reset draft' });
			}

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
		const tournamentId = params.id;

		try {
			const tournament = await pb.collection('fantasy_tournament').getOne(tournamentId);
			const league = await pb.collection('fantasy_league').getOne(tournament.fantasy_league);
			
			if (league.league_owner !== userId) {
				return fail(403, { error: 'Only league owner can undo picks' });
			}

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
		const golferId = formData.get('golferId') as string;
		const tournamentId = params.id;

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

			// Build draft_results from team_compositions
			const draftResults: Record<string, any> = {};
			for (const [oderId, teamComp] of Object.entries(updatedDraft.team_compositions)) {
				draftResults[oderId] = {
					fantasy_team: teamComp.fantasy_team,
					male_count: teamComp.male_count,
					female_count: teamComp.female_count,
					total_picks: teamComp.total_picks
				};
			}

			// Check if draft is complete
			const isDraftComplete = updatedDraft.status === 'completed';

			// Update tournament - set status to 'complete' if draft finished
			const updateData: Record<string, any> = {
				draft_managment: updatedDraft,
				draft_results: draftResults
			};

			if (isDraftComplete) {
				updateData.status = 'complete';
				updateData.draft_status = 'completed';
				console.log('✅ Draft complete! Updating tournament status to complete');
				
				// Update fantasy_team records with drafted golfers
				console.log('📝 Syncing drafted golfers to fantasy_team records...');
				for (const [oderId, teamComp] of Object.entries(updatedDraft.team_compositions)) {
					try {
						// Extract golfer IDs from the DraftGolfer objects
						const golferIds = ((teamComp as any).fantasy_team || []).map((g: any) => 
							typeof g === 'string' ? g : g.id
						);
						
						console.log(`  📋 User ${oderId} golfers:`, golferIds);
						
						// Find the fantasy_team record for this user and tournament
						const teamRecords = await pb.collection('fantasy_team').getFullList({
							filter: `fantasy_tournament = "${tournamentId}" && user = "${oderId}"`
						});
						
						if (teamRecords.length > 0) {
							await pb.collection('fantasy_team').update(teamRecords[0].id, {
								golfers: golferIds
							});
							console.log(`  ✅ Updated team for user ${oderId} with ${golferIds.length} golfers`);
						} else {
							// Create if doesn't exist
							await pb.collection('fantasy_team').create({
								fantasy_tournament: tournamentId,
								user: oderId,
								golfers: golferIds,
								total_score: 0
							});
							console.log(`  ✅ Created team for user ${oderId} with ${golferIds.length} golfers`);
						}
					} catch (teamError: any) {
						console.error(`  ❌ Error updating team for user ${oderId}:`, teamError.message);
					}
				}
				
				// Find and set the next tournament to 'next' status
				const allTournaments = await pb.collection('fantasy_tournament').getFullList({
					filter: `fantasy_league = "${tournament.fantasy_league}"`,
					sort: 'created'
				});
				
				const currentIndex = allTournaments.findIndex(t => t.id === tournamentId);
				if (currentIndex >= 0 && currentIndex < allTournaments.length - 1) {
					const nextTournament = allTournaments[currentIndex + 1];
					await pb.collection('fantasy_tournament').update(nextTournament.id, {
						status: 'next'
					});
					console.log(`✅ Set next tournament ${nextTournament.id} to 'next' status`);
				}
			}

			await pb.collection('fantasy_tournament').update(tournamentId, updateData);

			return { success: true, action: isDraftComplete ? 'draft_complete' : 'pick_made' };
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

		const tournamentId = params.id;

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

			// Build draft_results from team_compositions
			const draftResults: Record<string, any> = {};
			for (const [oderId, teamComp] of Object.entries(updatedDraft.team_compositions)) {
				draftResults[oderId] = {
					fantasy_team: teamComp.fantasy_team,
					male_count: teamComp.male_count,
					female_count: teamComp.female_count,
					total_picks: teamComp.total_picks
				};
			}

			// Check if draft is complete
			const isDraftComplete = updatedDraft.status === 'completed';

			// Update tournament - set status to 'complete' if draft finished
			const updateData: Record<string, any> = {
				draft_managment: updatedDraft,
				draft_results: draftResults
			};

			if (isDraftComplete) {
				updateData.status = 'complete';
				updateData.draft_status = 'completed';
				console.log('✅ Draft complete (auto-pick)! Updating tournament status to complete');
				
				// Update fantasy_team records with drafted golfers
				console.log('📝 Syncing drafted golfers to fantasy_team records...');
				for (const [oderId, teamComp] of Object.entries(updatedDraft.team_compositions)) {
					try {
						// Extract golfer IDs from the DraftGolfer objects
						const golferIds = ((teamComp as any).fantasy_team || []).map((g: any) => 
							typeof g === 'string' ? g : g.id
						);
						
						console.log(`  📋 User ${oderId} golfers:`, golferIds);
						
						// Find the fantasy_team record for this user and tournament
						const teamRecords = await pb.collection('fantasy_team').getFullList({
							filter: `fantasy_tournament = "${tournamentId}" && user = "${oderId}"`
						});
						
						if (teamRecords.length > 0) {
							await pb.collection('fantasy_team').update(teamRecords[0].id, {
								golfers: golferIds
							});
							console.log(`  ✅ Updated team for user ${oderId} with ${golferIds.length} golfers`);
						} else {
							// Create if doesn't exist
							await pb.collection('fantasy_team').create({
								fantasy_tournament: tournamentId,
								user: oderId,
								golfers: golferIds,
								total_score: 0
							});
							console.log(`  ✅ Created team for user ${oderId} with ${golferIds.length} golfers`);
						}
					} catch (teamError: any) {
						console.error(`  ❌ Error updating team for user ${oderId}:`, teamError.message);
					}
				}
				
				// Find and set the next tournament to 'next' status
				const allTournaments = await pb.collection('fantasy_tournament').getFullList({
					filter: `fantasy_league = "${tournament.fantasy_league}"`,
					sort: 'created'
				});
				
				const currentIndex = allTournaments.findIndex(t => t.id === tournamentId);
				if (currentIndex >= 0 && currentIndex < allTournaments.length - 1) {
					const nextTournament = allTournaments[currentIndex + 1];
					await pb.collection('fantasy_tournament').update(nextTournament.id, {
						status: 'next'
					});
					console.log(`✅ Set next tournament ${nextTournament.id} to 'next' status`);
				}
			}

			await pb.collection('fantasy_tournament').update(tournamentId, updateData);

			return { success: true, action: isDraftComplete ? 'draft_complete' : 'auto_pick_made', golferId: autoPick.id };
		} catch (error: any) {
			console.error('Error auto-picking:', error);
			return fail(500, { error: error.message || 'Failed to auto-pick' });
		}
	}
};
