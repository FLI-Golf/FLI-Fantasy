import { createServerPocketBase } from '$lib/pocketbase.server';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
	const pb = createServerPocketBase();
	
	// Get all cookies and reconstruct the cookie string for PocketBase
	const allCookies = cookies.getAll();
	const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

	if (!cookieString) {
		throw redirect(302, '/');
	}

	pb.authStore.loadFromCookie(cookieString);

	if (!pb.authStore.isValid) {
		throw redirect(302, '/');
	}

	const userId = pb.authStore.model?.id;

	try {
		// Fetch user's fantasy seasons
		const seasons = await pb.collection('fantasy_seasons_participants').getFullList({
			filter: `user = "${userId}"`,
			expand: 'season',
			sort: '-created'
		});

		// Fetch user's teams across all seasons
		const teams = await pb.collection('fantasy_teams').getFullList({
			filter: `owner = "${userId}"`,
			expand: 'season',
			sort: '-created'
		});

		// Fetch user's fantasy league participation status
		const userLeagueParticipation = await pb.collection('fantasy_season_participants').getFullList({
			filter: `user = "${userId}"`,
			expand: 'league'
		});

		const userLeagueIds = userLeagueParticipation.map(p => p.league).filter(Boolean);

		// Fetch all available fantasy leagues
		const allLeagues = await pb.collection('fantasy_league').getFullList({
			sort: '-created',
			expand: 'league_owner'
		});

		// Filter leagues: exclude ones user is already in or has pending request
		const availableLeagues = allLeagues.filter(league => !userLeagueIds.includes(league.id));

		// Get participant counts for each league
		const leaguesWithCounts = await Promise.all(
			availableLeagues.map(async (league) => {
				try {
					const participants = await pb.collection('fantasy_season_participants').getFullList({
						filter: `league = "${league.id}" && status = "approved"`
					});
					return {
						...league,
						participant_count: participants.length,
						settings: league.settings || { min_participants: 6 }
					};
				} catch {
					return {
						...league,
						participant_count: 0,
						settings: league.settings || { min_participants: 6 }
					};
				}
			})
		);

		return {
			user: pb.authStore.model,
			seasons: seasons.map((p) => p.expand?.season).filter(Boolean),
			teams,
			availableLeagues: leaguesWithCounts,
			userLeagues: userLeagueParticipation
		};
	} catch (error) {
		console.error('Error loading dashboard:', error);
		return {
			user: pb.authStore.model,
			seasons: [],
			teams: [],
			availableLeagues: [],
			userLeagues: []
		};
	}
};
