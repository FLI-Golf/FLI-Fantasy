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
		console.log('🔍 Loading player dashboard for user:', userId);
		
		// Fetch user's fantasy league participation (approved only for "My Leagues")
		const userParticipation = await pb.collection('fantasy_season_participants').getFullList({
			filter: `user = "${userId}" && status = "approved"`,
			expand: 'league'
		});

		console.log('📋 User participation records (approved):', userParticipation);

		const userLeagueIds = userParticipation.map(p => p.league).filter(Boolean);
		console.log('🎯 User league IDs extracted:', userLeagueIds);

		// Fetch user's fantasy leagues (owned leagues)
		let ownedLeagues = [];
		try {
			ownedLeagues = await pb.collection('fantasy_league').getFullList({
				filter: `league_owner = "${userId}"`,
				sort: '-created'
			});
			console.log('👑 User\'s owned leagues:', ownedLeagues.length);
		} catch (ownedLeaguesError) {
			console.error('❌ Error fetching owned leagues:', ownedLeaguesError);
		}

		// Fetch leagues where user is an approved participant
		let participantLeagues = [];
		if (userLeagueIds.length > 0) {
			try {
				const leagueIdsFilter = userLeagueIds.map(id => `id = "${id}"`).join(' || ');
				participantLeagues = await pb.collection('fantasy_league').getFullList({
					filter: leagueIdsFilter,
					sort: '-created'
				});
				console.log('🎯 User\'s participant leagues:', participantLeagues.length);
			} catch (participantLeaguesError) {
				console.error('❌ Error fetching participant leagues:', participantLeaguesError);
			}
		}

		// Combine owned and participant leagues (remove duplicates)
		const allUserLeagueIds = new Set([
			...ownedLeagues.map(l => l.id),
			...participantLeagues.map(l => l.id)
		]);
		const leagues = [...ownedLeagues, ...participantLeagues].filter((league, index, self) => 
			self.findIndex(l => l.id === league.id) === index
		);
		
		console.log('📊 Total user leagues:', leagues.length);

		// Get participant count for each league
		const leaguesWithCounts = await Promise.all(
			leagues.map(async (league) => {
				try {
					const participants = await pb.collection('fantasy_season_participants').getFullList({
						filter: `league = "${league.id}" && status = "approved"`
					});
					return { ...league, participantCount: participants.length };
				} catch {
					return { ...league, participantCount: 0 };
				}
			})
		);

		// Fetch all available fantasy leagues (excluding ones user is already in)
		let allLeagues = [];
		try {
			allLeagues = await pb.collection('fantasy_league').getFullList({
				sort: '-created',
				expand: 'league_owner'
			});
			console.log('🏆 Total fantasy leagues in database:', allLeagues.length);
			console.log('🏆 All fantasy leagues:', JSON.stringify(allLeagues, null, 2));
		} catch (leagueError) {
			console.error('❌ Error fetching fantasy leagues:', leagueError);
		}

		console.log('👤 All user league IDs (owned + participating):', Array.from(allUserLeagueIds));

		const availableLeagues = allLeagues.filter(league => !allUserLeagueIds.has(league.id));
		
		console.log('✅ Available leagues after filtering:', availableLeagues.length);
		console.log('✅ Available leagues details:', JSON.stringify(availableLeagues, null, 2));

		// Get participant counts for available leagues
		const availableLeaguesWithCounts = await Promise.all(
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

		console.log('📊 Final data:', {
			userLeagues: leaguesWithCounts.length,
			availableLeagues: availableLeaguesWithCounts.length
		});

		return {
			user: pb.authStore.model,
			leagues: leaguesWithCounts,
			availableLeagues: availableLeaguesWithCounts
		};
	} catch (error) {
		console.error('❌ Error loading player dashboard:', error);
		return {
			user: pb.authStore.model,
			leagues: [],
			availableLeagues: []
		};
	}
};
