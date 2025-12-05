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

		return {
			user: pb.authStore.model,
			seasons: seasons.map((p) => p.expand?.season).filter(Boolean),
			teams
		};
	} catch (error) {
		console.error('Error loading dashboard:', error);
		return {
			user: pb.authStore.model,
			seasons: [],
			teams: []
		};
	}
};
