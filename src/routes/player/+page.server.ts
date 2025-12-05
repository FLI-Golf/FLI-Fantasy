import { createServerPocketBase } from '$lib/pocketbase.server';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
	const pb = createServerPocketBase();
	
	// Get all cookies and reconstruct the cookie string for PocketBase
	const allCookies = cookies.getAll();
	const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
	
	console.log('🔍 Player page - Cookies:', allCookies.map(c => c.name));

	if (!cookieString) {
		console.log('❌ No cookies, redirecting to home');
		throw redirect(302, '/');
	}

	pb.authStore.loadFromCookie(cookieString);
	console.log('🔐 Auth loaded, isValid:', pb.authStore.isValid);
	console.log('👤 User:', pb.authStore.model?.email);

	if (!pb.authStore.isValid) {
		console.log('❌ Auth invalid, redirecting to home');
		throw redirect(302, '/');
	}

	const userId = pb.authStore.model?.id;

	try {
		// Fetch user's fantasy leagues
		const leagues = await pb.collection('fantasy_league').getFullList({
			filter: `league_owner = "${userId}" || participants ~ "${userId}"`,
			sort: '-created'
		});

		// Get participant count for each league
		const leaguesWithCounts = await Promise.all(
			leagues.map(async (league) => {
				try {
					const participants = await pb.collection('league_participants').getFullList({
						filter: `league = "${league.id}" && status = "approved"`
					});
					return { ...league, participantCount: participants.length };
				} catch {
					return { ...league, participantCount: 0 };
				}
			})
		);

		return {
			user: pb.authStore.model,
			leagues: leaguesWithCounts
		};
	} catch (error) {
		console.error('Error loading player dashboard:', error);
		return {
			user: pb.authStore.model,
			leagues: []
		};
	}
};
