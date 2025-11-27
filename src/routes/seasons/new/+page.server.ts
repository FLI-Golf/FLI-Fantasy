import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { fantasySeasonCreateSchema } from '$lib/schemas/fantasy';
import { FantasySeasonService } from '$lib/services/fantasySeasonService';
import { createServerPocketBase } from '$lib/pocketbase.server';

export const load: PageServerLoad = async () => {
	return {
		// could preload defaults here
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const raw = Object.fromEntries(formData);

		// Convert string numbers to actual numbers for Zod validation
		const processedData = {
			...raw,
			max_participants: raw.max_participants ? Number(raw.max_participants) : undefined
		};

		// TODO: replace this with your auth system
		// For now, just hard-code or stub an owner ID while you test:
		const ownerUserId = (locals as any)?.user?.id ?? 'TEST_OWNER_ID';

		const parsed = fantasySeasonCreateSchema.safeParse(processedData);

		if (!parsed.success) {
			const errors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				data: raw,
				errors
			});
		}

		try {
			const pb = createServerPocketBase();
			const fantasySeasonService = new FantasySeasonService(pb);
			const season = await fantasySeasonService.createSeasonForOwner(ownerUserId, parsed.data);

			// Redirect to a "season detail" page (we'll stub this route)
			throw redirect(303, `/seasons/${season.id}`);
		} catch (err: any) {
			console.error(err);
			return fail(500, {
				data: raw,
				errors: {
					_global: ['Failed to create season, please try again.']
				}
			});
		}
	}
};
