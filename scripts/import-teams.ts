import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-production-e678.up.railway.app';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

interface Team {
	name: string;
	team_number: number;
	is_active: boolean;
}

function parseCSV(content: string): Team[] {
	const lines = content.trim().split('\n');
	const teams: Team[] = [];

	// Skip header
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const [numberStr, name] = line.split(',').map(s => s.trim());
		const teamNumber = parseInt(numberStr);

		if (name && !isNaN(teamNumber)) {
			teams.push({
				name,
				team_number: teamNumber,
				is_active: true
			});
		}
	}

	return teams;
}

async function importTeams() {
	const pb = new PocketBase(POCKETBASE_URL);

	console.log('🏆 FLI Golf - Team Import');
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

		// Check if teams collection exists
		console.log('📋 Checking for teams collection...');
		try {
			await pb.collection('teams').getList(1, 1);
			console.log('✓ Teams collection exists\n');
		} catch (err) {
			console.error('❌ Teams collection does not exist!');
			console.error('Please create it manually in PocketBase admin with these fields:');
			console.error('  - name (text, required)');
			console.error('  - team_number (number, required)');
			console.error('  - logo_url (url, optional)');
			console.error('  - color (text, optional)');
			console.error('  - is_active (bool, required)\n');
			process.exit(1);
		}

		// Read CSV file
		const csvPath = path.join(process.cwd(), 'data', 'teams.csv');
		console.log(`📄 Reading teams from: ${csvPath}`);
		const csvContent = fs.readFileSync(csvPath, 'utf-8');
		const teams = parseCSV(csvContent);

		console.log(`✓ Parsed ${teams.length} teams from CSV\n`);

		// Import teams
		console.log('🏆 Importing teams...\n');
		let imported = 0;
		let skipped = 0;

		for (const team of teams) {
			try {
				// Check if team already exists
				const existing = await pb.collection('teams').getFullList({
					filter: `team_number = ${team.team_number}`
				});

				if (existing.length > 0) {
					console.log(`  ⏭️  Team #${team.team_number}: ${team.name} - already exists`);
					skipped++;
				} else {
					await pb.collection('teams').create(team);
					console.log(`  ✓ Team #${team.team_number}: ${team.name}`);
					imported++;
				}
			} catch (err: any) {
				console.log(`  ❌ Team #${team.team_number}: ${team.name} - Error: ${err.message}`);
				if (err.data) {
					console.log(`     Details:`, JSON.stringify(err.data, null, 2));
				}
			}
		}

		console.log('\n✅ Import completed!');
		console.log(`  - Imported: ${imported}`);
		console.log(`  - Skipped: ${skipped}`);
		console.log(`  - Total: ${imported + skipped}\n`);

		// Show all teams
		const allTeams = await pb.collection('teams').getFullList({ sort: 'team_number' });
		console.log('📊 All Teams in Database:');
		allTeams.forEach(t => {
			console.log(`  #${t.team_number} - ${t.name}`);
		});
		console.log(`\nTotal: ${allTeams.length} teams\n`);

	} catch (error: any) {
		console.error('\n❌ Error importing teams:', error.message);
		if (error.data) {
			console.error('Details:', JSON.stringify(error.data, null, 2));
		}
		process.exit(1);
	}
}

importTeams();
