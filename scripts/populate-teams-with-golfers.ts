import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-production-e678.up.railway.app';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

const teamNames = [
  'Hyzer Heros',
  'Huk-a-Mania',
  'Flight Squad',
  'Birdie Storm',
  'Chain Breakers',
  'Disc Jesters',
  'Midas Touch',
  'Chain Seekers',
  'Fairway Bombers',
  'Disc Dynasty',
  'Ace Makers',
  'Glide Masters',
  'Reserve Males',
  'Reserve Females'
];

async function populateTeams() {
	const pb = new PocketBase(POCKETBASE_URL);

	console.log('⛳ FLI Golf - Populate Teams with Golfers');
	console.log(`📡 Connecting to: ${POCKETBASE_URL}\n`);

	if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
		console.error('❌ Error: Admin credentials not found');
		process.exit(1);
	}

	try {
		await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
		console.log('✓ Authenticated\n');

		// Get all golfers sorted by ranking
		console.log('📊 Fetching golfers...');
		const golfersResult = await pb.collection('golfers').getList(1, 50, { 
			sort: 'gender,world_ranking' 
		});
		const golfers = golfersResult.items;

		const maleGolfers = golfers.filter(g => g.gender === 'male');
		const femaleGolfers = golfers.filter(g => g.gender === 'female');

		console.log(`✓ Found ${maleGolfers.length} male golfers`);
		console.log(`✓ Found ${femaleGolfers.length} female golfers\n`);

		// Clear existing teams
		console.log('🗑️  Clearing existing teams...');
		const existingTeams = await pb.collection('teams').getList(1, 50);
		for (const team of existingTeams.items) {
			await pb.collection('teams').delete(team.id);
		}
		console.log(`✓ Deleted ${existingTeams.items.length} teams\n`);

		// Create teams with golfer assignments
		console.log('🏆 Creating teams with golfer assignments:\n');

		const createdTeams = [];

		// Regular teams (1-12) - each gets 1 male + 1 female
		for (let i = 0; i < 12; i++) {
			const teamName = teamNames[i];
			const maleGolfer = maleGolfers[i];
			const femaleGolfer = femaleGolfers[i];

			const team = await pb.collection('teams').create({
				name: teamName,
				male_golfer: maleGolfer.id,
				female_golfer: femaleGolfer.id,
				male_reserve_used: false,
				female_reserve_used: false
			});

			createdTeams.push(team);

			console.log(`  ✓ ${teamName}`);
			console.log(`    👨 ${maleGolfer.name} (#${maleGolfer.world_ranking})`);
			console.log(`    👩 ${femaleGolfer.name} (#${femaleGolfer.world_ranking})`);
		}

		// Reserve Males team (13) - gets 2 male reserves
		console.log('\n🔄 Reserve Teams:\n');
		
		const reserveMalesTeam = await pb.collection('teams').create({
			name: 'Reserve Males',
			male_golfer: maleGolfers[12].id, // Eagle McMahon
			female_golfer: maleGolfers[13].id, // Joel Freeman (using female_golfer field for 2nd male)
			male_reserve_used: false,
			female_reserve_used: false
		});
		createdTeams.push(reserveMalesTeam);

		console.log(`  ✓ Reserve Males`);
		console.log(`    👨 ${maleGolfers[12].name} (#${maleGolfers[12].world_ranking})`);
		console.log(`    👨 ${maleGolfers[13].name} (#${maleGolfers[13].world_ranking})`);

		// Reserve Females team (14) - gets 2 female reserves
		const reserveFemalesTeam = await pb.collection('teams').create({
			name: 'Reserve Females',
			male_golfer: femaleGolfers[12].id, // Henna Blomroos (using male_golfer field for 1st female)
			female_golfer: femaleGolfers[13].id, // Valerie Mandujano
			male_reserve_used: false,
			female_reserve_used: false
		});
		createdTeams.push(reserveFemalesTeam);

		console.log(`  ✓ Reserve Females`);
		console.log(`    👩 ${femaleGolfers[12].name} (#${femaleGolfers[12].world_ranking})`);
		console.log(`    👩 ${femaleGolfers[13].name} (#${femaleGolfers[13].world_ranking})`);

		console.log(`\n✅ Created ${createdTeams.length} teams with golfer assignments!\n`);

		// Verify
		console.log('📊 Verification:\n');
		const verifyTeams = await pb.collection('teams').getList(1, 20, {
			expand: 'male_golfer,female_golfer'
		});

		console.log(`Total teams: ${verifyTeams.items.length}\n`);
		
		console.log('Sample teams:');
		verifyTeams.items.slice(0, 3).forEach((t: any) => {
			console.log(`  ${t.name}`);
			if (t.expand?.male_golfer) {
				console.log(`    - ${t.expand.male_golfer.name}`);
			}
			if (t.expand?.female_golfer) {
				console.log(`    - ${t.expand.female_golfer.name}`);
			}
		});

		console.log('\n✅ All teams populated successfully!\n');

	} catch (error: any) {
		console.error('\n❌ Error:', error.message);
		if (error.data) {
			console.error('Details:', JSON.stringify(error.data, null, 2));
		}
		process.exit(1);
	}
}

populateTeams();
