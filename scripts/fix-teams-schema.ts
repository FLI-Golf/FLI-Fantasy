import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-production-e678.up.railway.app';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

const teams = [
  { name: 'Hyzer Heros', team_number: 1 },
  { name: 'Huk-a-Mania', team_number: 2 },
  { name: 'Flight Squad', team_number: 3 },
  { name: 'Birdie Storm', team_number: 4 },
  { name: 'Chain Breakers', team_number: 5 },
  { name: 'Disc Jesters', team_number: 6 },
  { name: 'Midas Touch', team_number: 7 },
  { name: 'Chain Seekers', team_number: 8 },
  { name: 'Fairway Bombers', team_number: 9 },
  { name: 'Disc Dynasty', team_number: 10 },
  { name: 'Ace Makers', team_number: 11 },
  { name: 'Glide Masters', team_number: 13 },
  { name: 'Reserve Males', team_number: 14 },
  { name: 'Reserve Females', team_number: 15 }
];

async function fixTeamsSchema() {
	const pb = new PocketBase(POCKETBASE_URL);

	console.log('🔧 FLI Golf - Fix Teams Schema');
	console.log(`📡 Connecting to: ${POCKETBASE_URL}\n`);

	if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
		console.error('❌ Error: Admin credentials not found');
		process.exit(1);
	}

	try {
		await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
		console.log('✓ Authenticated\n');

		// Get existing assignments to preserve them
		console.log('📋 Backing up team-golfer assignments...');
		const existingAssignments = await pb.collection('team_golfers').getList(1, 100);
		const assignmentsBackup = existingAssignments.items.map(a => ({
			teamId: a.team,
			golferId: a.golfer,
			position: a.position
		}));
		console.log(`✓ Backed up ${assignmentsBackup.length} assignments\n`);

		// Delete all team_golfers
		console.log('🗑️  Clearing team_golfers...');
		for (const assignment of existingAssignments.items) {
			await pb.collection('team_golfers').delete(assignment.id);
		}
		console.log('✓ Cleared\n');

		// Delete all teams
		console.log('🗑️  Clearing teams...');
		const existingTeams = await pb.collection('teams').getList(1, 50);
		for (const team of existingTeams.items) {
			await pb.collection('teams').delete(team.id);
		}
		console.log('✓ Cleared\n');

		// Re-create teams with proper data
		console.log('📦 Creating teams with proper schema...');
		const createdTeams = [];
		for (const team of teams) {
			const created = await pb.collection('teams').create({
				name: team.name,
				team_number: team.team_number,
				is_active: true
			});
			createdTeams.push(created);
			console.log(`  ✓ ${team.name} (#${team.team_number})`);
		}
		console.log(`\n✓ Created ${createdTeams.length} teams\n`);

		// Re-create assignments using the new team IDs
		console.log('🔗 Restoring team-golfer assignments...');
		
		// Get golfers
		const golfers = await pb.collection('golfers').getList(1, 50, { sort: 'gender,world_ranking' });
		const males = golfers.items.filter(g => g.gender === 'male');
		const females = golfers.items.filter(g => g.gender === 'female');

		let restored = 0;

		// Assign to regular teams (first 12)
		for (let i = 0; i < 12; i++) {
			const team = createdTeams[i];
			const male = males[i];
			const female = females[i];

			await pb.collection('team_golfers').create({
				team: team.id,
				golfer: male.id,
				position: 'starter'
			});

			await pb.collection('team_golfers').create({
				team: team.id,
				golfer: female.id,
				position: 'starter'
			});

			restored += 2;
		}

		// Assign reserves
		const reserveMaleTeam = createdTeams[12]; // Team 14
		const reserveFemaleTeam = createdTeams[13]; // Team 15

		for (let i = 12; i < 14; i++) {
			await pb.collection('team_golfers').create({
				team: reserveMaleTeam.id,
				golfer: males[i].id,
				position: 'reserve'
			});

			await pb.collection('team_golfers').create({
				team: reserveFemaleTeam.id,
				golfer: females[i].id,
				position: 'reserve'
			});

			restored += 2;
		}

		console.log(`✓ Restored ${restored} assignments\n`);

		// Verify
		console.log('✅ Verification:\n');
		const verifyTeams = await pb.collection('teams').getList(1, 5);
		console.log('Sample teams:');
		verifyTeams.items.forEach(t => {
			console.log(`  - ${t.name} (#${t.team_number})`);
		});

		const verifyAssignments = await pb.collection('team_golfers').getList(1, 100, {
			expand: 'team,golfer'
		});
		console.log(`\nTotal assignments: ${verifyAssignments.items.length}`);

		console.log('\n✅ Teams schema fixed and data restored!\n');

	} catch (error: any) {
		console.error('\n❌ Error:', error.message);
		if (error.data) {
			console.error('Details:', JSON.stringify(error.data, null, 2));
		}
		process.exit(1);
	}
}

fixTeamsSchema();
