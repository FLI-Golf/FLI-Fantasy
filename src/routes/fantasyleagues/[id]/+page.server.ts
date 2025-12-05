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
				} catch {
					return p;
				}
			})
		);

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
			pendingRequests: [],
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
			const leagueService = new FantasyLeagueService(pb);
			const isOwner = await leagueService.isLeagueOwner(params.id, userId);

			if (!isOwner) {
				return fail(403, { error: 'Only league owner can approve requests' });
			}

			await leagueService.approveParticipant(participantId, userId);
			return { success: true, action: 'approved' };
		} catch (error) {
			console.error('Error approving participant:', error);
			return fail(500, { error: 'Failed to approve participant' });
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

		if (!pb.authStore.isValid) {
			return fail(401, { error: 'You must be logged in to join a league' });
		}

		const userId = pb.authStore.model?.id;

		try {
			const leagueService = new FantasyLeagueService(pb);
			await leagueService.requestToJoin(params.id, userId);
			return { success: true, action: 'requested' };
		} catch (error) {
			console.error('Error requesting to join:', error);
			return fail(500, { error: 'Failed to request to join league' });
		}
	}
};
