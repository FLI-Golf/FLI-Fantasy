import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-production-e678.up.railway.app';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

async function seedData() {
	const pb = new PocketBase(POCKETBASE_URL);

	console.log('🌱 Starting database seeding...');
	console.log(`📡 Connecting to: ${POCKETBASE_URL}`);

	// Authenticate as admin to have permissions to create/read records
	if (ADMIN_EMAIL && ADMIN_PASSWORD) {
		try {
			console.log('🔐 Authenticating as admin...');
			await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
			console.log('✓ Authenticated successfully\n');
		} catch (err: any) {
			console.log('⚠️  Admin auth failed, continuing without admin privileges\n');
		}
	}

	try {
		// Create test users
		console.log('\n👤 Creating test users...');
		
		const testUsers = [
			{ email: 'owner@test.com', password: 'password123', name: 'Season Owner' },
			{ email: 'player1@test.com', password: 'password123', name: 'Player One' },
			{ email: 'player2@test.com', password: 'password123', name: 'Player Two' },
			{ email: 'player3@test.com', password: 'password123', name: 'Player Three' }
		];

		const createdUsers = [];
		for (const user of testUsers) {
			try {
				// Check if user exists
				const existing = await pb.collection('users').getFullList({
					filter: `email = "${user.email}"`
				});

				if (existing.length > 0) {
					console.log(`  ✓ User ${user.email} already exists (ID: ${existing[0].id})`);
					createdUsers.push(existing[0]);
				} else {
					const created = await pb.collection('users').create({
						...user,
						passwordConfirm: user.password,
						emailVisibility: true
					});
					console.log(`  ✓ Created user: ${user.email} (ID: ${created.id})`);
					createdUsers.push(created);
				}
			} catch (err: any) {
				console.log(`  ⚠️  Error with user ${user.email}: ${err.message}`);
				// Try to fetch anyway
				try {
					const existing = await pb.collection('users').getFullList({
						filter: `email = "${user.email}"`
					});
					if (existing.length > 0) {
						createdUsers.push(existing[0]);
					}
				} catch {}
			}
		}

		if (createdUsers.length === 0) {
			console.error('\n❌ No users found. Cannot create seasons without users.');
			process.exit(1);
		}

		const ownerId = createdUsers[0].id;
		console.log(`\n📋 Using owner ID: ${ownerId}`);

		// Create fantasy seasons
		console.log('\n🏆 Creating fantasy seasons...');
		
		const seasons = [
			{
				name: 'Spring Championship 2024',
				description: 'Compete in the ultimate spring golf fantasy league',
				owner: ownerId,
				status: 'filling',
				max_participants: 6,
				participants_count: 3,
				schedule_generated: false,
				start_date: '2024-03-01 00:00:00.000Z',
				end_date: '2024-05-31 00:00:00.000Z'
			},
			{
				name: 'Summer Masters League',
				description: 'Join the most competitive summer golf season',
				owner: ownerId,
				status: 'active',
				max_participants: 6,
				participants_count: 4,
				schedule_generated: true,
				start_date: '2024-06-01 00:00:00.000Z',
				end_date: '2024-08-31 00:00:00.000Z'
			},
			{
				name: 'Fall Classic Tournament',
				description: 'Experience the thrill of fall golf competition',
				owner: ownerId,
				status: 'filling',
				max_participants: 5,
				participants_count: 2,
				schedule_generated: false,
				start_date: '2024-09-01 00:00:00.000Z',
				end_date: '2024-11-30 00:00:00.000Z'
			},
			{
				name: 'Winter Invitational',
				description: 'Elite winter golf fantasy league',
				owner: ownerId,
				status: 'completed',
				max_participants: 4,
				participants_count: 4,
				schedule_generated: true,
				start_date: '2023-12-01 00:00:00.000Z',
				end_date: '2024-02-28 00:00:00.000Z'
			}
		];

		const createdSeasons = [];
		for (const season of seasons) {
			try {
				// Check if season already exists
				const existing = await pb.collection('fantasy_seasons').getFullList({
					filter: `name = "${season.name}" && owner = "${season.owner}"`
				});

				if (existing.length > 0) {
					console.log(`  ✓ Season "${season.name}" already exists`);
					createdSeasons.push(existing[0]);
				} else {
					const created = await pb.collection('fantasy_seasons').create(season);
					console.log(`  ✓ Created season: ${season.name}`);
					createdSeasons.push(created);
				}
			} catch (err: any) {
				console.log(`  ⚠️  Error creating season ${season.name}: ${err.message}`);
				if (err.data) {
					console.log(`     Details:`, err.data);
				}
			}
		}

		// Create participants for seasons
		if (createdSeasons.length > 0 && createdUsers.length > 1) {
			console.log('\n👥 Adding participants to seasons...');
			
			for (const season of createdSeasons) {
				// Add owner as participant
				try {
					await pb.collection('fantasy_season_participants').create({
						season: season.id,
						user: ownerId,
						is_owner: true,
						joined_at: new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '.000Z'),
						total_points: Math.floor(Math.random() * 1000)
					});
					console.log(`  ✓ Added owner to ${season.name}`);
				} catch (err: any) {
					console.log(`  ⚠️  Error adding owner: ${err.message}`);
				}

				// Add other participants
				const numParticipants = Math.min(season.participants_count - 1, createdUsers.length - 1);
				for (let i = 1; i <= numParticipants; i++) {
					try {
						await pb.collection('fantasy_season_participants').create({
							season: season.id,
							user: createdUsers[i].id,
							is_owner: false,
							joined_at: new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '.000Z'),
							total_points: Math.floor(Math.random() * 1000)
						});
						console.log(`  ✓ Added ${createdUsers[i].name} to ${season.name}`);
					} catch (err: any) {
						console.log(`  ⚠️  Error adding participant: ${err.message}`);
					}
				}
			}
		}

		console.log('\n✅ Database seeding completed successfully!');
		console.log('\n📝 Test credentials:');
		console.log('   Email: owner@test.com');
		console.log('   Password: password123');
		
	} catch (error: any) {
		console.error('\n❌ Error seeding database:', error.message);
		process.exit(1);
	}
}

seedData();
