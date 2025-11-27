import type { PageServerLoad } from './$types';
import { FantasySeasonService } from '$lib/services/fantasySeasonService';
import { createServerPocketBase } from '$lib/pocketbase.server';

export const load: PageServerLoad = async ({ locals }) => {
	// TODO: replace with actual auth
	const ownerUserId = (locals as any)?.user?.id ?? 'TEST_OWNER_ID';

	const pb = createServerPocketBase();
	const fantasySeasonService = new FantasySeasonService(pb);
	const seasons = await fantasySeasonService.listSeasonsByOwner(ownerUserId);

	return { seasons };
};
