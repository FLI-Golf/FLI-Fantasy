import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { fantasyLeagueCreateSchema } from '$lib/schemas/fantasy';
import { FantasyLeagueService } from '$lib/services/fantasyLeagueService';
import { createServerPocketBase } from '$lib/pocketbase.server';

export const load: PageServerLoad = async ({ cookies }) => {
	const pb = createServerPocketBase();
	const allCookies = cookies.getAll();
	const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

	if (!cookieString) {
		throw redirect(302, '/');
	}

	pb.authStore.loadFromCookie(cookieString);

	if (!pb.authStore.isValid) {
		throw redirect(302, '/');
	}

	return {
		user: pb.authStore.model
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		console.log('═══════════════════════════════════════');
		console.log('🚀 FANTASY LEAGUE CREATION STARTED');
		console.log('═══════════════════════════════════════');
			console.log('Step 1: Creating PocketBase instance...');
			const pb = createServerPocketBase();
			console.log('✅ PocketBase instance created');
			
			console.log('Step 2: Getting cookies...');
			const allCookies = cookies.getAll();
			console.log('🍪 Cookies received:', JSON.stringify(allCookies.map(c => ({ name: c.name, hasValue: !!c.value }))));
			
			const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
			console.log('🍪 Cookie string length:', cookieString.length);

			console.log('Step 3: Loading auth from cookie...');
			pb.authStore.loadFromCookie(cookieString);
			console.log('✅ Auth loaded');
		
			console.log('Step 4: Checking auth validity...');
			console.log('🔐 Auth valid:', pb.authStore.isValid);
			console.log('👤 User email:', pb.authStore.model?.email);
			console.log('👤 User ID:', pb.authStore.model?.id);
			console.log('👤 User name:', pb.authStore.model?.name);

		if (!pb.authStore.isValid) {
			console.log('❌ AUTH INVALID - user not logged in');
			console.log('═══════════════════════════════════════');
			return fail(401, {
				errors: { _global: ['You must be logged in to create a league'] }
			});
		}

		console.log('✅ Auth is valid!');
		
		console.log('Step 5: Extracting user data...');
		const userId = pb.authStore.model?.id;
		const userName = pb.authStore.model?.name || 'Player';
		console.log('👤 Using userId:', userId);
		console.log('👤 Using userName:', userName);
		
		console.log('Step 6: Reading form data...');
		const formData = await request.formData();
		const raw = Object.fromEntries(formData);
		console.log('📝 Form data:', JSON.stringify(raw));

		console.log('Step 7: Processing data...');
		const processedData = {
			season: raw.season || '2026'
		};
		console.log('📝 Processed data:', JSON.stringify(processedData));

		console.log('Step 8: Validating schema...');
		const parsed = fantasyLeagueCreateSchema.safeParse(processedData);

		if (!parsed.success) {
			console.log('❌ SCHEMA VALIDATION FAILED');
			console.log('Errors:', JSON.stringify(parsed.error.flatten().fieldErrors));
			console.log('═══════════════════════════════════════');
			const errors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				data: raw,
				errors
			});
		}
		
		console.log('✅ Schema validation passed');

		console.log('Step 9: Creating league service...');
		try {
			const leagueService = new FantasyLeagueService(pb);
			console.log('✅ League service created');
			
			const leagueData = {
				...parsed.data,
				userName
			};
			
			console.log('Step 10: Calling createFantasyLeague...');
			console.log('📝 League data:', JSON.stringify(leagueData));
			
			const { league } = await leagueService.createFantasyLeague(userId, leagueData);
			
			console.log('✅✅✅ FANTASY LEAGUE CREATED SUCCESSFULLY!');
			console.log('🎉 League ID:', league.id);
			console.log('🎉 League title:', league.title);
			console.log('═══════════════════════════════════════');

			throw redirect(303, `/fantasyleagues/${league.id}`);
		} catch (err: any) {
			// Check if this is a redirect (which is expected)
			if (err.status === 303 || err.status === 302) {
				console.log('✅ Redirecting to league page...');
				throw err; // Re-throw the redirect
			}
			
			console.error('═══════════════════════════════════════');
			console.error('❌❌❌ LEAGUE CREATION ERROR');
			console.error('═══════════════════════════════════════');
			console.error('Error type:', typeof err);
			console.error('Error message:', err.message);
			console.error('Error data:', JSON.stringify(err.data));
			console.error('Error status:', err.status);
			console.error('Full error:', JSON.stringify(err, null, 2));
			console.error('Stack trace:', err.stack);
			console.error('═══════════════════════════════════════');
			return fail(500, {
				data: raw,
				errors: {
					_global: [err.message || 'Failed to create league. Please try again.']
				}
			});
		}
	}
};
