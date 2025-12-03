import type { PageServerLoad } from './$types';
import { FantasySeasonService } from '$lib/services/fantasySeasonService';
import { createServerPocketBase } from '$lib/pocketbase.server';

export const load: PageServerLoad = async ({ locals }) => {
	const pb = createServerPocketBase();
	
	// If no user is authenticated, return all seasons (or empty array)
	const ownerUserId = (locals as any)?.user?.id;
	
	if (!ownerUserId) {
		// Return all seasons when not authenticated (for browsing)
		try {
			const allSeasons = await pb.collection('fantasy_seasons').getFullList({
				sort: '-created'
			});
			return { seasons: allSeasons };
		} catch (error) {
			console.error('Error fetching seasons:', error);
			return { seasons: [] };
		}
	}

	// Return seasons owned by the authenticated user
	const fantasySeasonService = new FantasySeasonService(pb);
	try {
		const seasons = await fantasySeasonService.listSeasonsByOwner(ownerUserId);
		return { seasons };
	} catch (error) {
		console.error('Error fetching user seasons:', error);
		return { seasons: [] };
	}
};
