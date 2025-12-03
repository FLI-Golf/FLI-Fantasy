import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pocketbase-production-e678.up.railway.app');

// Sample pro golfers
const sampleGolfers = [
	{ name: 'Scottie Scheffler', country: 'USA', ranking: 1 },
	{ name: 'Rory McIlroy', country: 'NIR', ranking: 2 },
	{ name: 'Jon Rahm', country: 'ESP', ranking: 3 },
	{ name: 'Viktor Hovland', country: 'NOR', ranking: 4 },
	{ name: 'Xander Schauffele', country: 'USA', ranking: 5 },
	{ name: 'Patrick Cantlay', country: 'USA', ranking: 6 },
	{ name: 'Collin Morikawa', country: 'USA', ranking: 7 },
	{ name: 'Max Homa', country: 'USA', ranking: 8 },
	{ name: 'Justin Thomas', country: 'USA', ranking: 9 },
	{ name: 'Jordan Spieth', country: 'USA', ranking: 10 },
];

// Sample scores (to par)
const sampleScores = [-5, -3, -4, -2, -3, -1, -2, 1, -1, 1];

async function seedGolferScores() {
	try {
		console.log('🏌️ FLI Golf - Seed Golfer Scores');
		console.log('📡 Connecting to:', pb.baseUrl);
		console.log();

		// Authenticate
		const email = process.env.POCKETBASE_ADMIN_EMAIL;
		const password = process.env.POCKETBASE_ADMIN_PASSWORD;

		if (!email || !password) {
			throw new Error('Missing POCKETBASE_ADMIN_EMAIL or POCKETBASE_ADMIN_PASSWORD');
		}

		await pb.admins.authWithPassword(email, password);
		console.log('✓ Authenticated\n');

		// Check if we need to create a season first
		let seasons = await pb.collection('fantasy_seasons').getFullList();
		let season;

		if (seasons.length === 0) {
			console.log('📝 Creating sample season...\n');
			season = await pb.collection('fantasy_seasons').create({
				name: '2024 Season',
				start_date: new Date().toISOString().split('T')[0],
				end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
				is_active: true
			});
			console.log(`✓ Created season: ${season.name}\n`);
		} else {
			season = seasons[0];
			console.log(`✓ Using existing season: ${season.name}\n`);
		}

		// Check if we need to create a tournament and round
		let tournaments = await pb.collection('tournaments').getFullList();
		let tournament;

		if (tournaments.length === 0) {
			console.log('📝 Creating sample tournament...\n');
			tournament = await pb.collection('tournaments').create({
				name: 'The Masters',
				season: season.id,
				start_date: new Date().toISOString().split('T')[0],
				end_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
				location: 'Augusta National Golf Club',
				is_active: true
			});
			console.log(`✓ Created tournament: ${tournament.name}\n`);
		} else {
			tournament = tournaments[0];
			console.log(`✓ Using existing tournament: ${tournament.name}\n`);
		}

		// Check for tournament round
		let rounds = await pb.collection('tournament_rounds').getFullList({
			filter: `tournament = "${tournament.id}"`
		});

		let round;
		if (rounds.length === 0) {
			console.log('📝 Creating tournament round...\n');
			round = await pb.collection('tournament_rounds').create({
				tournament: tournament.id,
				round_number: 1,
				date: new Date().toISOString().split('T')[0],
				is_completed: false
			});
			console.log(`✓ Created round 1\n`);
		} else {
			round = rounds[0];
			console.log(`✓ Using existing round ${round.round_number}\n`);
		}

		// Create golfers and scores
		console.log('📊 Creating golfers and scores...\n');

		for (let i = 0; i < sampleGolfers.length; i++) {
			const golferData = sampleGolfers[i];
			const score = sampleScores[i];

			try {
				// Check if golfer exists
				let golfers = await pb.collection('golfers').getFullList({
					filter: `name = "${golferData.name}"`
				});

				let golfer;
				if (golfers.length === 0) {
					golfer = await pb.collection('golfers').create({
						name: golferData.name,
						country: golferData.country,
						world_ranking: golferData.ranking,
						is_active: true
					});
				} else {
					golfer = golfers[0];
				}

				// Check if score already exists
				const existingScores = await pb.collection('golfer_scores').getFullList({
					filter: `golfer = "${golfer.id}" && tournament_rounds = "${round.id}"`
				});

				if (existingScores.length > 0) {
					console.log(`  ⚠️  Score already exists for ${golferData.name}`);
					continue;
				}

				// Create score using API directly
				const response = await fetch(`${pb.baseUrl}/api/collections/golfer_scores/records`, {
					method: 'POST',
					headers: {
						'Authorization': pb.authStore.token,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						tournament_rounds: round.id,
						golfer: golfer.id,
						score: score,
						total_strokes: 72 + score,
						position: i + 1,
						is_cut: false
					})
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(JSON.stringify(error));
				}

				const parDisplay = score === 0 ? 'E' : score > 0 ? `+${score}` : score;
				console.log(`  ✓ ${golferData.name} (${golferData.country}): ${parDisplay}`);
			} catch (err: any) {
				console.log(`  ✗ Error creating score for ${golferData.name}: ${err.message}`);
				if (err.data) {
					console.log(`     ${JSON.stringify(err.data)}`);
				}
			}
		}

		console.log('\n✅ Golfer scores seeded successfully!\n');
		console.log('📊 Summary:');
		console.log(`  - Tournament: ${tournament.name}`);
		console.log(`  - Round: ${round.round_number}`);
		console.log(`  - Golfers: ${sampleGolfers.length}\n`);

	} catch (error: any) {
		console.error('\n❌ Error:', error.message);
		if (error.data) {
			console.error('Details:', JSON.stringify(error.data, null, 2));
		}
		process.exit(1);
	}
}

seedGolferScores();
