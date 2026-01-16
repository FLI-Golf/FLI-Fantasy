import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { FantasyLeagueService } from '$lib/services/fantasyLeagueService';
import { createServerPocketBase } from '$lib/pocketbase.server';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const pb = createServerPocketBase();
	const allCookies = cookies.getAll();
	const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

	pb.authStore.loadFromCookie(cookieString);

	const leagueId = params.id;
	const userId = pb.authStore.model?.id;

	try {
		const leagueService = new FantasyLeagueService(pb);
		
		// Get league with expanded fantasy_tournaments
		const leagueRecord = await pb.collection('fantasy_league').getOne(leagueId, {
			expand: 'fantasy_tournaments'
		});
		
		console.log('League fantasy_tournaments field:', leagueRecord.fantasy_tournaments);
		console.log('Expanded fantasy_tournaments:', leagueRecord.expand?.fantasy_tournaments);
		
		const participants = await leagueService.getLeagueParticipants(leagueId);
		const isOwner = userId ? await leagueService.isLeagueOwner(leagueId, userId) : false;
		const userStatus = userId ? await leagueService.getUserParticipationStatus(leagueId, userId) : null;

		// Fetch upcoming tournaments for preview (what WILL be generated)
		let upcomingTournaments = [];
		if (leagueRecord.season) {
			try {
				upcomingTournaments = await pb.collection('tournaments').getFullList({
					filter: `season = "${leagueRecord.season}" && (status = "next" || status = "upcoming")`,
					sort: 'start_date'
				});
			} catch (error) {
				console.error('Error fetching upcoming tournaments:', error);
			}
		}

		// Expand user details for participants
		const participantsWithUsers = await Promise.all(
			participants.map(async (p) => {
				try {
					const user = await pb.collection('users').getOne(p.user);
					return { ...p, expand: { user } };
				} catch (error) {
					console.error(`Failed to expand user ${p.user}:`, error);
					return p;
				}
			})
		);

		// Fetch pending join requests (only for owner)
		let pendingRequests = [];
		if (isOwner) {
			try {
				const pending = await pb.collection('fantasy_season_participants').getFullList({
					filter: `league = "${leagueId}" && status = "pending"`,
					expand: 'user'
				});
				pendingRequests = pending;
				console.log(`📋 Found ${pendingRequests.length} pending requests`);
			} catch (error) {
				console.error('Error fetching pending requests:', error);
			}
		}

		// Get fantasy tournaments from expanded data
		const fantasyTournaments = leagueRecord.expand?.fantasy_tournaments || [];
		
		// For each fantasy tournament, we need to get the actual tournament details
		// Since fantasy_tournament doesn't have a direct tournament relation,
		// we'll need to match them by season or show just the fantasy tournament data
		const tournamentsData = [];
		
		if (leagueRecord.season) {
			try {
				// Get all tournaments for this season
				const seasonTournaments = await pb.collection('tournaments').getFullList({
					filter: `season = "${leagueRecord.season}"`,
					sort: 'start_date'
				});
				
				// Match fantasy tournaments with actual tournaments by index
				for (let i = 0; i < fantasyTournaments.length && i < seasonTournaments.length; i++) {
					tournamentsData.push({
						...seasonTournaments[i],
						fantasyTournament: fantasyTournaments[i]
					});
				}
			} catch (error) {
				console.error('Error fetching season tournaments:', error);
			}
		}

		return {
			league: leagueRecord,
			participants: participantsWithUsers,
			pendingRequests,
			isOwner,
			userStatus,
			currentUser: pb.authStore.model,
			tournaments: tournamentsData,
			fantasyTournaments,
			upcomingTournaments // Preview of what will be generated
		};
	} catch (error) {
		console.error('Error loading league:', error);
		throw error;
	}
};

export const actions: Actions = {
	generateTournaments: async ({ cookies, params }) => {
		const pb = createServerPocketBase();
		const allCookies = cookies.getAll();
		const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

		pb.authStore.loadFromCookie(cookieString);

		if (!pb.authStore.isValid) {
			return fail(401, { error: 'Unauthorized' });
		}

		const userId = pb.authStore.model?.id;

		try {
			const leagueService = new FantasyLeagueService(pb);
			const isOwner = await leagueService.isLeagueOwner(params.id, userId);

			if (!isOwner) {
				return fail(403, { error: 'Only league owner can generate tournaments' });
			}

			console.log('🚀 MANUALLY TRIGGERING TOURNAMENT GENERATION');
			const tournaments = await leagueService.generateFantasyTournaments(params.id);
			
			return { 
				success: true, 
				action: 'tournaments_generated',
				count: tournaments.length 
			};
		} catch (error) {
			console.error('Error generating tournaments:', error);
			return fail(500, { error: 'Failed to generate tournaments' });
		}
	},

	approve: async ({ request, cookies, params }) => {
		const pb = createServerPocketBase();
		const allCookies = cookies.getAll();
		const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

		pb.authStore.loadFromCookie(cookieString);

		if (!pb.authStore.isValid) {
			return fail(401, { error: 'Unauthorized' });
		}

		const userId = pb.authStore.model?.id;
		const formData = await request.formData();
		const participantId = formData.get('participantId') as string;

		try {
			console.log('🎯 APPROVE ACTION');
			console.log('League ID:', params.id);
			console.log('Participant ID:', participantId);
			console.log('User ID:', userId);

			const leagueService = new FantasyLeagueService(pb);
			const isOwner = await leagueService.isLeagueOwner(params.id, userId);

			console.log('Is owner?', isOwner);

			if (!isOwner) {
				console.error('❌ User is not the owner');
				return fail(403, { error: 'Only league owner can approve requests' });
			}

			console.log('✅ Calling approveParticipant...');
			await leagueService.approveParticipant(params.id, participantId);
			console.log('✅ Participant approved successfully');
			return { success: true, action: 'approved' };
		} catch (error: any) {
			console.error('❌ Error approving participant:', error);
			console.error('Error message:', error.message);
			console.error('Error stack:', error.stack);
			return fail(500, { error: `Failed to approve participant: ${error.message}` });
		}
	},

	reject: async ({ request, cookies, params }) => {
		const pb = createServerPocketBase();
		const allCookies = cookies.getAll();
		const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

		pb.authStore.loadFromCookie(cookieString);

		if (!pb.authStore.isValid) {
			return fail(401, { error: 'Unauthorized' });
		}

		const userId = pb.authStore.model?.id;
		const formData = await request.formData();
		const participantId = formData.get('participantId') as string;

		try {
			const leagueService = new FantasyLeagueService(pb);
			const isOwner = await leagueService.isLeagueOwner(params.id, userId);

			if (!isOwner) {
				return fail(403, { error: 'Only league owner can reject requests' });
			}

			await leagueService.rejectParticipant(participantId);
			return { success: true, action: 'rejected' };
		} catch (error) {
			console.error('Error rejecting participant:', error);
			return fail(500, { error: 'Failed to reject participant' });
		}
	},

	join: async ({ cookies, params }) => {
		const pb = createServerPocketBase();
		const allCookies = cookies.getAll();
		const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

		pb.authStore.loadFromCookie(cookieString);

		console.log('🎯 JOIN ACTION TRIGGERED');
		console.log('League ID:', params.id);
		console.log('Auth valid:', pb.authStore.isValid);
		console.log('User ID:', pb.authStore.model?.id);

		if (!pb.authStore.isValid) {
			console.error('❌ User not authenticated');
			return fail(401, { error: 'You must be logged in to join a league' });
		}

		const userId = pb.authStore.model?.id;

		try {
			const leagueService = new FantasyLeagueService(pb);
			await leagueService.requestToJoin(params.id, userId);
			console.log('✅ Join request successful');
			return { success: true, action: 'requested' };
		} catch (error: any) {
			console.error('❌ Error requesting to join:', error);
			console.error('Error details:', {
				message: error.message,
				status: error.status,
				response: error.response,
				data: error.data
			});
			
			// Return more specific error message
			const errorMessage = error.data?.message || error.message || 'Failed to request to join league';
			return fail(500, { error: errorMessage });
		}
	},

	generateTournaments: async ({ cookies, params }) => {
		const pb = createServerPocketBase();
		const allCookies = cookies.getAll();
		const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

		pb.authStore.loadFromCookie(cookieString);

		if (!pb.authStore.isValid) {
			return fail(401, { error: 'Unauthorized' });
		}

		const userId = pb.authStore.model?.id;

		try {
			const leagueService = new FantasyLeagueService(pb);
			const isOwner = await leagueService.isLeagueOwner(params.id, userId);

			if (!isOwner) {
				return fail(403, { error: 'Only league owner can generate tournaments' });
			}

			console.log('🎯 MANUAL TOURNAMENT GENERATION TRIGGERED');
			const tournaments = await leagueService.generateFantasyTournaments(params.id);
			console.log(`✅ Generated ${tournaments.length} fantasy tournaments`);
			
			return { success: true, action: 'tournaments_generated', count: tournaments.length };
		} catch (error: any) {
			console.error('❌ Error generating tournaments:', error);
			return fail(500, { error: `Failed to generate tournaments: ${error.message}` });
		}
	}
};
