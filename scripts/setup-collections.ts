import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-production-e678.up.railway.app';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

async function setupCollections() {
	const pb = new PocketBase(POCKETBASE_URL);

	console.log('🔧 PocketBase Collection Setup');
	console.log(`📡 Connecting to: ${POCKETBASE_URL}`);

	if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
		console.error('\n❌ Error: Admin credentials not found in environment variables');
		console.error('Please set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD in .env file\n');
		process.exit(1);
	}

	try {
		console.log('\n🔐 Authenticating...');
		try {
			await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
			console.log('✓ Authenticated successfully\n');
		} catch (authError: any) {
			console.error('❌ Authentication failed:', authError.message);
			if (authError.status === 400) {
				console.error('Invalid credentials. Please check POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD');
			}
			throw authError;
		}

		// Check if collections already exist
		const collections = await pb.collections.getFullList();
		const existingNames = collections.map(c => c.name);

		// Create fantasy_seasons collection
		if (existingNames.includes('fantasy_seasons')) {
			console.log('✓ fantasy_seasons collection already exists');
		} else {
			console.log('📦 Creating fantasy_seasons collection...');
			await pb.collections.create({
				name: 'fantasy_seasons',
				type: 'base',
				schema: [
					{
						name: 'name',
						type: 'text',
						required: true,
						options: { min: 3 }
					},
					{
						name: 'description',
						type: 'text',
						required: false
					},
					{
						name: 'owner',
						type: 'relation',
						required: true,
						options: {
							collectionId: collections.find(c => c.name === 'users')?.id,
							cascadeDelete: false,
							minSelect: null,
							maxSelect: 1,
							displayFields: ['name']
						}
					},
					{
						name: 'status',
						type: 'select',
						required: true,
						options: {
							maxSelect: 1,
							values: ['filling', 'active', 'completed', 'cancelled']
						}
					},
					{
						name: 'max_participants',
						type: 'number',
						required: true,
						options: { min: 2, max: 100 }
					},
					{
						name: 'participants_count',
						type: 'number',
						required: true,
						options: { min: 0 }
					},
					{
						name: 'schedule_generated',
						type: 'bool',
						required: true
					},
					{
						name: 'start_date',
						type: 'date',
						required: false
					},
					{
						name: 'end_date',
						type: 'date',
						required: false
					}
				],
				listRule: '@request.auth.id != ""',
				viewRule: '@request.auth.id != ""',
				createRule: '@request.auth.id != "" && @request.auth.id = owner',
				updateRule: '@request.auth.id = owner',
				deleteRule: '@request.auth.id = owner'
			});
			console.log('✓ Created fantasy_seasons collection');
		}

		// Refresh collections list to get the new IDs
		const updatedCollections = await pb.collections.getFullList();
		const fantasySeasonId = updatedCollections.find(c => c.name === 'fantasy_seasons')?.id;
		const usersId = updatedCollections.find(c => c.name === 'users')?.id;

		// Create fantasy_season_participants collection
		if (existingNames.includes('fantasy_season_participants')) {
			console.log('✓ fantasy_season_participants collection already exists');
		} else {
			console.log('📦 Creating fantasy_season_participants collection...');
			await pb.collections.create({
				name: 'fantasy_season_participants',
				type: 'base',
				schema: [
					{
						name: 'season',
						type: 'relation',
						required: true,
						options: {
							collectionId: fantasySeasonId,
							cascadeDelete: true,
							minSelect: null,
							maxSelect: 1,
							displayFields: ['name']
						}
					},
					{
						name: 'user',
						type: 'relation',
						required: true,
						options: {
							collectionId: usersId,
							cascadeDelete: false,
							minSelect: null,
							maxSelect: 1,
							displayFields: ['name']
						}
					},
					{
						name: 'is_owner',
						type: 'bool',
						required: true
					},
					{
						name: 'joined_at',
						type: 'date',
						required: true
					},
					{
						name: 'total_points',
						type: 'number',
						required: false,
						options: { min: 0 }
					}
				],
				listRule: '@request.auth.id != ""',
				viewRule: '@request.auth.id != ""',
				createRule: '@request.auth.id != "" && @request.auth.id = user',
				updateRule: 'season.owner = @request.auth.id || user = @request.auth.id',
				deleteRule: 'season.owner = @request.auth.id',
				indexes: [
					'CREATE UNIQUE INDEX idx_season_user ON fantasy_season_participants (season, user)'
				]
			});
			console.log('✓ Created fantasy_season_participants collection');
		}

		console.log('\n✅ Collection setup completed successfully!');
		console.log('\n📝 Next steps:');
		console.log('   Run: npx tsx scripts/seed-data.ts');
		console.log('   This will populate the database with test data.\n');

	} catch (error: any) {
		console.error('\n❌ Error setting up collections:', error.message);
		if (error.data) {
			console.error('Details:', JSON.stringify(error.data, null, 2));
		}
		if (error.response) {
			console.error('Response:', error.response);
		}
		console.error('Full error:', error);
		process.exit(1);
	}
}

setupCollections();
