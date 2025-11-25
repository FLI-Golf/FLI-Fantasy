import type { PageServerLoad } from './$types';
import { fantasySeasonService } from '$lib/services/fantasySeasonService';

export const load: PageServerLoad = async ({ locals }) => {
	// TODO: replace with actual auth
	const ownerUserId = (locals as any)?.user?.id ?? 'TEST_OWNER_ID';

	const seasons = await fantasySeasonService.listSeasonsByOwner(ownerUserId);

	return { seasons };
};
