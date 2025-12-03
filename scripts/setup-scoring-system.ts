import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-production-e678.up.railway.app';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

async function setupScoringSystem() {
	const pb = new PocketBase(POCKETBASE_URL);

	console.log('🏌️ FLI Golf - Setup Real-Time Scoring System');
	console.log(`📡 Connecting to: ${POCKETBASE_URL}\n`);

	if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
		console.error('❌ Error: Admin credentials not found');
		process.exit(1);
	}

	try {
		await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
		console.log('✓ Authenticated\n');

		const collections = await pb.collections.getFullList();
		const usersCol = collections.find(c => c.name === 'users');
		const tournamentsCol = collections.find(c => c.name === 'tournaments');
		const golfersCol = collections.find(c => c.name === 'golfers');
		const teamsCol = collections.find(c => c.name === 'teams');
		const seasonsCol = collections.find(c => c.name === 'fantasy_seasons');

		// 1. Create user_profile collection
		console.log('📦 Creating user_profile collection...');
		let userProfileCol = collections.find(c => c.name === 'user_profile');
		
		if (!userProfileCol) {
			userProfileCol = await pb.collections.create({
				name: 'user_profile',
				type: 'base',
				listRule: '@request.auth.id != ""',
				viewRule: '@request.auth.id != ""',
				createRule: '@request.auth.id != ""',
				updateRule: null,
				deleteRule: null
			});

			await pb.collections.update(userProfileCol.id, {
				schema: [
					{
						name: 'user',
						type: 'relation',
						required: true,
						options: {
							collectionId: usersCol.id,
							cascadeDelete: true,
							maxSelect: 1
						}
					},
					{
						name: 'role',
						type: 'select',
						required: true,
						options: {
							maxSelect: 1,
							values: ['participant', 'scorekeeper', 'admin']
						}
					},
					{
						name: 'assigned_pairing',
						type: 'number',
						required: false,
						options: { min: 1, max: 6 }
					}
				]
			});
			console.log('✓ Created user_profile collection\n');
		} else {
			console.log('✓ user_profile collection exists\n');
		}

		// 2. Create tournament_rounds collection
		console.log('📦 Creating tournament_rounds collection...');
		let roundsCol = collections.find(c => c.name === 'tournament_rounds');
		
		if (!roundsCol) {
			roundsCol = await pb.collections.create({
				name: 'tournament_rounds',
				type: 'base',
				listRule: '@request.auth.id != ""',
				viewRule: '@request.auth.id != ""',
				createRule: null,
				updateRule: null,
				deleteRule: null
			});

			await pb.collections.update(roundsCol.id, {
				schema: [
					{
						name: 'tournament',
						type: 'relation',
						required: true,
						options: {
							collectionId: tournamentsCol.id,
							cascadeDelete: true,
							maxSelect: 1
						}
					},
					{
						name: 'round_number',
						type: 'number',
						required: true,
						options: { min: 1, max: 4 }
					},
					{
						name: 'round_date',
						type: 'date',
						required: true
					},
					{
						name: 'status',
						type: 'select',
						required: true,
						options: {
							maxSelect: 1,
							values: ['upcoming', 'in_progress', 'completed']
						}
					}
				]
			});
			console.log('✓ Created tournament_rounds collection\n');
		} else {
			console.log('✓ tournament_rounds collection exists\n');
		}

		// 3. Create tournament_pairings collection (6 pairings, 2 teams each)
		console.log('📦 Creating tournament_pairings collection...');
		let pairingsCol = collections.find(c => c.name === 'tournament_pairings');
		
		if (!pairingsCol) {
			const updatedCollections = await pb.collections.getFullList();
			roundsCol = updatedCollections.find(c => c.name === 'tournament_rounds');
			
			pairingsCol = await pb.collections.create({
				name: 'tournament_pairings',
				type: 'base',
				listRule: '@request.auth.id != ""',
				viewRule: '@request.auth.id != ""',
				createRule: null,
				updateRule: null,
				deleteRule: null
			});

			await pb.collections.update(pairingsCol.id, {
				schema: [
					{
						name: 'tournament_round',
						type: 'relation',
						required: true,
						options: {
							collectionId: roundsCol.id,
							cascadeDelete: true,
							maxSelect: 1
						}
					},
					{
						name: 'pairing_number',
						type: 'number',
						required: true,
						options: { min: 1, max: 6 }
					},
					{
						name: 'team1',
						type: 'relation',
						required: true,
						options: {
							collectionId: teamsCol.id,
							cascadeDelete: false,
							maxSelect: 1
						}
					},
					{
						name: 'team2',
						type: 'relation',
						required: true,
						options: {
							collectionId: teamsCol.id,
							cascadeDelete: false,
							maxSelect: 1
						}
					},
					{
						name: 'scorekeeper',
						type: 'relation',
						required: false,
						options: {
							collectionId: usersCol.id,
							cascadeDelete: false,
							maxSelect: 1
						}
					},
					{
						name: 'starting_hole',
						type: 'number',
						required: false,
						options: { min: 1 }
					}
				]
			});
			console.log('✓ Created tournament_pairings collection\n');
		} else {
			console.log('✓ tournament_pairings collection exists\n');
		}

		// 4. Create golfer_scores collection (ONE record per golfer per round)
		console.log('📦 Creating golfer_scores collection...');
		let scoresCol = collections.find(c => c.name === 'golfer_scores');
		
		if (!scoresCol) {
			const updatedCollections = await pb.collections.getFullList();
			roundsCol = updatedCollections.find(c => c.name === 'tournament_rounds');
			
			scoresCol = await pb.collections.create({
				name: 'golfer_scores',
				type: 'base',
				listRule: '@request.auth.id != ""',
				viewRule: '@request.auth.id != ""',
				createRule: null,
				updateRule: null,
				deleteRule: null
			});

			await pb.collections.update(scoresCol.id, {
				schema: [
					{
						name: 'tournament_round',
						type: 'relation',
						required: true,
						options: {
							collectionId: roundsCol.id,
							cascadeDelete: true,
							maxSelect: 1
						}
					},
					{
						name: 'golfer',
						type: 'relation',
						required: true,
						options: {
							collectionId: golfersCol.id,
							cascadeDelete: false,
							maxSelect: 1
						}
					},
					{
						name: 'hole_scores',
						type: 'json',
						required: false
					},
					{
						name: 'total_score',
						type: 'number',
						required: false
					},
					{
						name: 'score_to_par',
						type: 'number',
						required: false
					},
					{
						name: 'updated_by',
						type: 'relation',
						required: false,
						options: {
							collectionId: usersCol.id,
							cascadeDelete: false,
							maxSelect: 1
						}
					}
				]
			});
			console.log('✓ Created golfer_scores collection\n');
		} else {
			console.log('✓ golfer_scores collection exists\n');
		}

		// 5. Create fantasy_league_drafts collection
		console.log('📦 Creating fantasy_league_drafts collection...');
		let draftsCol = collections.find(c => c.name === 'fantasy_league_drafts');
		
		if (!draftsCol) {
			draftsCol = await pb.collections.create({
				name: 'fantasy_league_drafts',
				type: 'base',
				listRule: '@request.auth.id != ""',
				viewRule: '@request.auth.id != ""',
				createRule: null,
				updateRule: null,
				deleteRule: null
			});

			await pb.collections.update(draftsCol.id, {
				schema: [
					{
						name: 'fantasy_season',
						type: 'relation',
						required: true,
						options: {
							collectionId: seasonsCol.id,
							cascadeDelete: true,
							maxSelect: 1
						}
					},
					{
						name: 'tournament',
						type: 'relation',
						required: true,
						options: {
							collectionId: tournamentsCol.id,
							cascadeDelete: true,
							maxSelect: 1
						}
					},
					{
						name: 'participant',
						type: 'relation',
						required: true,
						options: {
							collectionId: usersCol.id,
							cascadeDelete: false,
							maxSelect: 1
						}
					},
					{
						name: 'team',
						type: 'relation',
						required: true,
						options: {
							collectionId: teamsCol.id,
							cascadeDelete: false,
							maxSelect: 1
						}
					},
					{
						name: 'draft_order',
						type: 'number',
						required: true,
						options: { min: 1, max: 6 }
					},
					{
						name: 'pick_number',
						type: 'number',
						required: true,
						options: { min: 1, max: 12 }
					}
				]
			});
			console.log('✓ Created fantasy_league_drafts collection\n');
		} else {
			console.log('✓ fantasy_league_drafts collection exists\n');
		}

		console.log('✅ All collections created successfully!\n');

		// Create test scorekeepers
		console.log('👥 Creating test scorekeepers...\n');
		
		const scorekeeperEmails = [
			'scorekeeper1@fligolf.com',
			'scorekeeper2@fligolf.com',
			'scorekeeper3@fligolf.com',
			'scorekeeper4@fligolf.com',
			'scorekeeper5@fligolf.com',
			'scorekeeper6@fligolf.com'
		];

		for (let i = 0; i < scorekeeperEmails.length; i++) {
			const email = scorekeeperEmails[i];
			
			try {
				// Check if user exists
				const existing = await pb.collection('users').getFullList({
					filter: `email = "${email}"`
				});

				let userId;
				if (existing.length > 0) {
					userId = existing[0].id;
					console.log(`  ✓ Scorekeeper ${i + 1} already exists`);
				} else {
					const user = await pb.collection('users').create({
						email,
						password: 'scorekeeper123',
						passwordConfirm: 'scorekeeper123',
						name: `Scorekeeper ${i + 1}`,
						emailVisibility: true
					});
					userId = user.id;
					console.log(`  ✓ Created Scorekeeper ${i + 1}`);
				}

				// Create or update profile
				const existingProfile = await pb.collection('user_profile').getFullList({
					filter: `user = "${userId}"`
				});

				if (existingProfile.length === 0) {
					await pb.collection('user_profile').create({
						user: userId,
						role: 'scorekeeper',
						assigned_pairing: i + 1
					});
					console.log(`    → Assigned to pairing ${i + 1}`);
				}
			} catch (err: any) {
				console.log(`  ⚠️  Error with ${email}: ${err.message}`);
			}
		}

		console.log('\n✅ Setup complete!\n');
		console.log('📊 Summary:');
		console.log('  - user_profile: Role-based access (participant/scorekeeper/admin)');
		console.log('  - tournament_rounds: Rounds within tournaments');
		console.log('  - tournament_pairings: 6 pairings, 2 teams each, 1 scorekeeper');
		console.log('  - golfer_scores: Real-time scores (ONE per golfer per round)');
		console.log('  - fantasy_league_drafts: Track team picks per league');
		console.log('  - 6 scorekeepers created (scorekeeper1-6@fligolf.com / scorekeeper123)');
		console.log('\n🎯 Next: Create tournaments and assign pairings!\n');

	} catch (error: any) {
		console.error('\n❌ Error:', error.message);
		if (error.data) {
			console.error('Details:', JSON.stringify(error.data, null, 2));
		}
		process.exit(1);
	}
}

setupScoringSystem();
