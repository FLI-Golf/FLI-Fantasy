import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-production-e678.up.railway.app';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

interface Golfer {
	name: string;
	gender: string;
	world_ranking: number;
	is_active: boolean;
	is_reserve: boolean;
}

function parseCSV(content: string): Golfer[] {
	const lines = content.trim().split('\n');
	const golfers: Golfer[] = [];

	// Skip header
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		// Parse CSV line (handle quoted fields)
		const matches = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
		if (!matches || matches.length < 3) continue;

		const fields = matches.map(m => m.replace(/^,?"?|"?$/g, '').trim());
		const name = fields[0];
		const gender = fields[1];
		const ranking = parseInt(fields[2]);

		if (name && gender && !isNaN(ranking)) {
			golfers.push({
				name,
				gender: gender.toLowerCase(), // Convert to lowercase for PocketBase
				world_ranking: ranking,
				is_active: true,
				is_reserve: false
			});
		}
	}

	return golfers;
}

async function importGolfers() {
	const pb = new PocketBase(POCKETBASE_URL);

	console.log('⛳ FLI Golf - Golfer Import');
	console.log(`📡 Connecting to: ${POCKETBASE_URL}\n`);

	if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
		console.error('❌ Error: Admin credentials not found in environment variables');
		console.error('Please set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD\n');
		process.exit(1);
	}

	try {
		// Authenticate as admin
		console.log('🔐 Authenticating as admin...');
		await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
		console.log('✓ Authenticated successfully\n');

		// Check if golfers collection exists
		console.log('📋 Checking for golfers collection...');
		const collections = await pb.collections.getFullList();
		const golfersCollection = collections.find(c => c.name === 'golfers');

		if (!golfersCollection) {
			console.log('📦 Creating golfers collection...');
			await pb.collections.create({
				name: 'golfers',
				type: 'base',
				schema: [
					{
						name: 'name',
						type: 'text',
						required: true
					},
					{
						name: 'gender',
						type: 'select',
						required: true,
						options: {
							maxSelect: 1,
							values: ['Male', 'Female']
						}
					},
					{
						name: 'world_ranking',
						type: 'number',
						required: false
					},
					{
						name: 'country',
						type: 'text',
						required: false
					},
					{
						name: 'photo_url',
						type: 'url',
						required: false
					},
					{
						name: 'is_active',
						type: 'bool',
						required: true
					},
					{
						name: 'is_reserve',
						type: 'bool',
						required: true
					},
					{
						name: 'external_id',
						type: 'text',
						required: false
					}
				],
				listRule: '@request.auth.id != ""',
				viewRule: '@request.auth.id != ""',
				createRule: null, // Admin only
				updateRule: null, // Admin only
				deleteRule: null  // Admin only
			});
			console.log('✓ Created golfers collection\n');
		} else {
			console.log('✓ Golfers collection exists\n');
		}

		// Read CSV file
		const csvPath = path.join(process.cwd(), 'data', 'golfers.csv');
		console.log(`📄 Reading golfers from: ${csvPath}`);
		const csvContent = fs.readFileSync(csvPath, 'utf-8');
		const allGolfers = parseCSV(csvContent);

		console.log(`✓ Parsed ${allGolfers.length} golfers from CSV\n`);

		// Separate by gender and sort by ranking
		const maleGolfers = allGolfers
			.filter(g => g.gender === 'male')
			.sort((a, b) => a.world_ranking - b.world_ranking);

		const femaleGolfers = allGolfers
			.filter(g => g.gender === 'female')
			.sort((a, b) => a.world_ranking - b.world_ranking);

		console.log(`👨 Male golfers: ${maleGolfers.length}`);
		console.log(`👩 Female golfers: ${femaleGolfers.length}\n`);

		// Select top 12 male + 2 reserves
		const selectedMales = maleGolfers.slice(0, 12);
		const reserveMales = maleGolfers.slice(12, 14).map(g => ({ ...g, is_reserve: true }));

		// Select top 12 female + 2 reserves
		const selectedFemales = femaleGolfers.slice(0, 12);
		const reserveFemales = femaleGolfers.slice(12, 14).map(g => ({ ...g, is_reserve: true }));

		const golfersToImport = [
			...selectedMales,
			...reserveMales,
			...selectedFemales,
			...reserveFemales
		];

		console.log('📊 Import Summary:');
		console.log(`  - Male starters: ${selectedMales.length}`);
		console.log(`  - Male reserves: ${reserveMales.length}`);
		console.log(`  - Female starters: ${selectedFemales.length}`);
		console.log(`  - Female reserves: ${reserveFemales.length}`);
		console.log(`  - Total: ${golfersToImport.length}\n`);

		// Import golfers
		console.log('⛳ Importing golfers...\n');
		let imported = 0;
		let skipped = 0;

		for (const golfer of golfersToImport) {
			try {
				// Check if golfer already exists
				const existing = await pb.collection('golfers').getFullList({
					filter: `name = "${golfer.name.replace(/"/g, '\\"')}"`
				});

				if (existing.length > 0) {
					console.log(`  ⏭️  ${golfer.name} (${golfer.gender}) - already exists`);
					skipped++;
				} else {
					await pb.collection('golfers').create(golfer);
					const status = golfer.is_reserve ? '(RESERVE)' : '';
					console.log(`  ✓ ${golfer.name} (${golfer.gender}, #${golfer.world_ranking}) ${status}`);
					imported++;
				}
			} catch (err: any) {
				console.log(`  ❌ ${golfer.name} - Error: ${err.message}`);
				if (err.data) {
					console.log(`     Details:`, JSON.stringify(err.data, null, 2));
				}
			}
		}

		console.log('\n✅ Import completed!');
		console.log(`  - Imported: ${imported}`);
		console.log(`  - Skipped: ${skipped}`);
		console.log(`  - Total: ${imported + skipped}\n`);

		// Show breakdown
		const allImported = await pb.collection('golfers').getFullList();
		const maleCount = allImported.filter(g => g.gender === 'male' && !g.is_reserve).length;
		const maleReserves = allImported.filter(g => g.gender === 'male' && g.is_reserve).length;
		const femaleCount = allImported.filter(g => g.gender === 'female' && !g.is_reserve).length;
		const femaleReserves = allImported.filter(g => g.gender === 'female' && g.is_reserve).length;

		console.log('📊 Database Summary:');
		console.log(`  - Male starters: ${maleCount}`);
		console.log(`  - Male reserves: ${maleReserves}`);
		console.log(`  - Female starters: ${femaleCount}`);
		console.log(`  - Female reserves: ${femaleReserves}`);
		console.log(`  - Total golfers: ${allImported.length}\n`);

	} catch (error: any) {
		console.error('\n❌ Error importing golfers:', error.message);
		if (error.data) {
			console.error('Details:', JSON.stringify(error.data, null, 2));
		}
		process.exit(1);
	}
}

importGolfers();
