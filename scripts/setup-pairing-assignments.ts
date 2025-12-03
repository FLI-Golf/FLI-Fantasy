import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-production-e678.up.railway.app';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

async function setupPairingAssignments() {
	const pb = new PocketBase(POCKETBASE_URL);

	console.log('🏌️ FLI Golf - Setup Pairing Assignments');
	console.log(`📡 Connecting to: ${POCKETBASE_URL}\n`);

	if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
		console.error('❌ Error: Admin credentials not found');
		process.exit(1);
	}

	try {
		await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
		console.log('✓ Authenticated\n');

		// Get all teams (excluding reserve teams)
		const teamsResult = await pb.collection('teams').getList(1, 20);
		const allTeams = teamsResult.items;
		
		// Filter out reserve teams (last 2)
		const actualTeams = allTeams.slice(0, 12);
		
		console.log(`📊 Found ${actualTeams.length} actual teams\n`);

		// Create 6 groups (2 teams each)
		console.log('📦 Creating 6 groups (2 teams each)...\n');
		const groups = [];
		
		for (let i = 0; i < 6; i++) {
			const teamA = actualTeams[i * 2];
			const teamB = actualTeams[i * 2 + 1];
			
			try {
				const group = await pb.collection('groups').create({
					team_a: teamA.id,
					team_b: teamB.id
				});
				
				groups.push(group);
				console.log(`  ✓ Group ${i + 1}: Team ${i * 2 + 1} + Team ${i * 2 + 2}`);
			} catch (err: any) {
				console.log(`  ✗ Error creating group ${i + 1}: ${err.message}`);
			}
		}

		console.log(`\n✓ Created ${groups.length} groups\n`);

		// Create 3 pairing assignments (2 groups each = 4 teams = 8 golfers per scorekeeper)
		console.log('📦 Creating 3 pairing assignments (2 groups each)...\n');
		
		for (let i = 0; i < 3; i++) {
			const group1 = groups[i * 2];
			const group2 = groups[i * 2 + 1];
			
			if (!group1 || !group2) {
				console.log(`  ⚠️  Not enough groups for pairing ${i + 1}`);
				continue;
			}
			
			try {
				await pb.collection('pairing_assigment').create({
					group: [group1.id, group2.id]
				});
				
				console.log(`  ✓ Pairing Assignment ${i + 1}:`);
				console.log(`    - Group ${i * 2 + 1} (Teams ${i * 4 + 1}, ${i * 4 + 2})`);
				console.log(`    - Group ${i * 2 + 2} (Teams ${i * 4 + 3}, ${i * 4 + 4})`);
				console.log(`    → Scorekeeper scores 4 teams (8 golfers)\n`);
			} catch (err: any) {
				console.log(`  ✗ Error creating pairing ${i + 1}: ${err.message}`);
			}
		}

		console.log('✅ Setup complete!\n');
		console.log('📊 Structure:');
		console.log('  - 6 groups (2 teams each)');
		console.log('  - 3 pairing assignments (2 groups each)');
		console.log('  - Each scorekeeper scores 4 teams = 8 golfers (4 male + 4 female)\n');

		// Verify
		const groupsCount = await pb.collection('groups').getList(1, 50);
		const pairingsCount = await pb.collection('pairing_assigment').getList(1, 50);
		
		console.log('✓ Verification:');
		console.log(`  Groups: ${groupsCount.items.length}`);
		console.log(`  Pairing Assignments: ${pairingsCount.items.length}\n`);

	} catch (error: any) {
		console.error('\n❌ Error:', error.message);
		if (error.data) {
			console.error('Details:', JSON.stringify(error.data, null, 2));
		}
		process.exit(1);
	}
}

setupPairingAssignments();
