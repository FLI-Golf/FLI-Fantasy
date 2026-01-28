import { getAdminPb } from '$lib/pocketbase.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const pb = await getAdminPb();

	// Get next upcoming tournament
	const now = new Date().toISOString();
	let nextTournament = null;
	try {
		const tournaments = await pb.collection('tournaments').getList(1, 1, {
			filter: `status = "upcoming"`,
			sort: 'start_date'
		});
		nextTournament = tournaments.items[0] || null;
	} catch (e) {
		console.error('Error fetching tournaments:', e);
	}

	// Get featured golfers (top ranked)
	let featuredGolfers: any[] = [];
	try {
		const golfers = await pb.collection('golfers').getList(1, 6, {
			filter: 'is_active = true',
			sort: 'world_ranking'
		});
		
		// Get all teams to map golfers to their teams
		const teams = await pb.collection('teams').getFullList();
		const golferTeamMap = new Map<string, any>();
		teams.forEach(team => {
			if (team.male_golfer) golferTeamMap.set(team.male_golfer, team);
			if (team.female_golfer) golferTeamMap.set(team.female_golfer, team);
		});
		
		// Add full image URL and team info for each golfer
		featuredGolfers = golfers.items.map(golfer => {
			const team = golferTeamMap.get(golfer.id);
			return {
				...golfer,
				imageUrl: golfer.image 
					? pb.files.getURL(golfer, golfer.image)
					: null,
				team: team ? {
					id: team.id,
					name: team.name,
					miniLogoUrl: team.mini_logo 
						? pb.files.getURL(team, team.mini_logo)
						: null,
					primaryColor: team.primary_color || null,
					secondaryColor: team.secondary_color || null
				} : null
			};
		});
	} catch (e) {
		console.error('Error fetching golfers:', e);
	}

	// Get all teams with their golfers for team grid
	let teamsWithGolfers: any[] = [];
	try {
		const teams = await pb.collection('teams').getFullList({
			expand: 'male_golfer,female_golfer',
			sort: 'name'
		});
		
		// Filter out reserve teams and add image URLs
		teamsWithGolfers = teams
			.filter(team => !team.name.toLowerCase().includes('reserve'))
			.map(team => {
				const maleGolfer = team.expand?.male_golfer;
				const femaleGolfer = team.expand?.female_golfer;
				
				return {
					id: team.id,
					name: team.name,
					logoUrl: team.logo ? pb.files.getURL(team, team.logo) : null,
					miniLogoUrl: team.mini_logo ? pb.files.getURL(team, team.mini_logo) : null,
					primaryColor: team.primary_color,
					secondaryColor: team.secondary_color,
					maleGolfer: maleGolfer ? {
						id: maleGolfer.id,
						name: maleGolfer.name,
						imageUrl: maleGolfer.image ? pb.files.getURL(maleGolfer, maleGolfer.image) : null
					} : null,
					femaleGolfer: femaleGolfer ? {
						id: femaleGolfer.id,
						name: femaleGolfer.name,
						imageUrl: femaleGolfer.image ? pb.files.getURL(femaleGolfer, femaleGolfer.image) : null
					} : null
				};
			});
	} catch (e) {
		console.error('Error fetching teams:', e);
	}

	// Get active ticker items for news carousel
	let newsItems: any[] = [];
	try {
		const ticker = await pb.collection('ticker_items').getList(1, 10, {
			filter: 'is_active = true',
			sort: '-priority,-created'
		});
		newsItems = ticker.items;
	} catch (e) {
		console.error('Error fetching news:', e);
	}

	// Get sponsors
	let sponsors: any[] = [];
	try {
		const sponsorList = await pb.collection('sponsors').getList(1, 20, {
			filter: 'is_active = true',
			sort: 'display_order'
		});
		sponsors = sponsorList.items;
	} catch (e) {
		console.error('Error fetching sponsors:', e);
	}

	// Get featured products for shop promo
	let featuredProducts: any[] = [];
	try {
		const products = await pb.collection('products').getList(1, 4, {
			filter: 'is_active = true',
			sort: '-created'
		});
		featuredProducts = products.items;
	} catch (e) {
		console.error('Error fetching products:', e);
	}

	return {
		nextTournament,
		featuredGolfers,
		teamsWithGolfers,
		newsItems,
		sponsors,
		featuredProducts
	};
};
