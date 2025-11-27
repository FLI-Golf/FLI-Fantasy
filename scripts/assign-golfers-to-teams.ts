import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-production-e678.up.railway.app';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

async function assignGolfersToTeams() {
	const pb = new PocketBase(POCKETBASE_URL);

	console.log('⛳ FLI Golf - Assign Golfers to Teams');
	console.log(`📡 Connecting to: ${POCKETBASE_URL}\n`);

	if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
		console.error('❌ Error: Admin credentials not found in environment variables');
		process.exit(1);
	}

	try {
		// Authenticate as admin
		console.log('🔐 Authenticating as admin...');
		await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
		console.log('✓ Authenticated successfully\n');

		// Check if team_golfers collection exists, if not create it
		console.log('📋 Checking for team_golfers collection...');
		let teamGolfersExists = false;
		try {
			await pb.collection('team_golfers').getList(1, 1);
			teamGolfersExists = true;
			console.log('✓ team_golfers collection exists\n');
		} catch (err) {
			console.log('📦 Creating team_golfers collection...');
			const collections = await pb.collections.getFullList();
			const teamsId = collections.find(c => c.name === 'teams')?.id;
			const golfersId = collections.find(c => c.name === 'golfers')?.id;

			await pb.collections.create({
				name: 'team_golfers',
				type: 'base',
				schema: [
					{
						name: 'team',
						type: 'relation',
						required: true,
						options: {
							collectionId: teamsId,
							cascadeDelete: true,
							minSelect: null,
							maxSelect: 1,
							displayFields: ['name']
						}
					},
					{
						name: 'golfer',
						type: 'relation',
						required: true,
						options: {
							collectionId: golfersId,
							cascadeDelete: false,
							minSelect: null,
							maxSelect: 1,
							displayFields: ['name']
						}
					},
					{
						name: 'position',
						type: 'select',
						required: false,
						options: {
							maxSelect: 1,
							values: ['starter', 'reserve']
						}
					}
				],
				listRule: '@request.auth.id != ""',
				viewRule: '@request.auth.id != ""',
				createRule: null,
				updateRule: null,
				deleteRule: null
			});
			console.log('✓ Created team_golfers collection\n');
		}

		// Get all teams and golfers
		console.log('📊 Fetching teams and golfers...');
		const teamsResult = await pb.collection('teams').getList(1, 50, { sort: 'created' });
		const teamsRaw = teamsResult.items;
		const golfersResult = await pb.collection('golfers').getList(1, 50, { sort: 'gender,world_ranking' });
		const golfers = golfersResult.items;

		// Since team names aren't being returned due to schema issues, we'll work with order
		// Teams were created in this order: 1-11, 13-15
		const teams = teamsRaw.slice(0, 14); // All 14 teams

		const maleGolfers = golfers.filter(g => g.gender === 'male');
		const femaleGolfers = golfers.filter(g => g.gender === 'female');

		console.log(`✓ Found ${teams.length} teams`);
		console.log(`✓ Found ${maleGolfers.length} male golfers`);
		console.log(`✓ Found ${femaleGolfers.length} female golfers\n`);

		// Last 2 teams are reserves (team 14 = Reserve Males, team 15 = Reserve Females)
		const reserveMaleTeam = teams[teams.length - 2]; // Team 14
		const reserveFemaleTeam = teams[teams.length - 1]; // Team 15

		console.log('🏆 Team Assignments:\n');

		// Regular teams are first 12 teams (excluding last 2 reserve teams)
		const regularTeams = teams.slice(0, 12);

		console.log(`Regular teams: ${regularTeams.length}`);
		console.log(`Assigning top 12 males and top 12 females...\n`);

		let maleIndex = 0;
		let femaleIndex = 0;
		let assigned = 0;

		for (const team of regularTeams) {
			if (maleIndex >= 12 || femaleIndex >= 12) {
				console.log(`⚠️  Ran out of golfers for team: ${team.name}`);
				continue;
			}

			const maleGolfer = maleGolfers[maleIndex];
			const femaleGolfer = femaleGolfers[femaleIndex];

			try {
				// Check if assignment already exists
				const existingMale = await pb.collection('team_golfers').getFullList({
					filter: `team = "${team.id}" && golfer = "${maleGolfer.id}"`
				});

				if (existingMale.length === 0) {
					await pb.collection('team_golfers').create({
						team: team.id,
						golfer: maleGolfer.id,
						position: 'starter'
					});
				}

				const existingFemale = await pb.collection('team_golfers').getFullList({
					filter: `team = "${team.id}" && golfer = "${femaleGolfer.id}"`
				});

				if (existingFemale.length === 0) {
					await pb.collection('team_golfers').create({
						team: team.id,
						golfer: femaleGolfer.id,
						position: 'starter'
					});
				}

				console.log(`  ✓ Team ${maleIndex} (ID: ${team.id.substring(0, 8)}...)`);
				console.log(`    👨 ${maleGolfer.name} (#${maleGolfer.world_ranking})`);
				console.log(`    👩 ${femaleGolfer.name} (#${femaleGolfer.world_ranking})`);
				
				assigned += 2;
				maleIndex++;
				femaleIndex++;
			} catch (err: any) {
				console.log(`  ❌ Error assigning to team: ${err.message}`);
			}
		}

		// Assign reserves to reserve teams
		console.log('\n🔄 Assigning Reserves:\n');

		if (reserveMaleTeam) {
			console.log(`  Reserve Male Team (ID: ${reserveMaleTeam.id.substring(0, 8)}...)`);
			// Assign males 13-14 (Eagle McMahon, Joel Freeman)
			for (let i = 12; i < Math.min(14, maleGolfers.length); i++) {
				const golfer = maleGolfers[i];
				try {
					const existing = await pb.collection('team_golfers').getFullList({
						filter: `team = "${reserveMaleTeam.id}" && golfer = "${golfer.id}"`
					});

					if (existing.length === 0) {
						await pb.collection('team_golfers').create({
							team: reserveMaleTeam.id,
							golfer: golfer.id,
							position: 'reserve'
						});
						console.log(`    ✓ ${golfer.name} (#${golfer.world_ranking})`);
						assigned++;
					}
				} catch (err: any) {
					console.log(`    ❌ Error: ${err.message}`);
				}
			}
		}

		if (reserveFemaleTeam) {
			console.log(`\n  Reserve Female Team (ID: ${reserveFemaleTeam.id.substring(0, 8)}...)`);
			// Assign females 13-14 (Henna Blomroos, Valerie Mandujano)
			for (let i = 12; i < Math.min(14, femaleGolfers.length); i++) {
				const golfer = femaleGolfers[i];
				try {
					const existing = await pb.collection('team_golfers').getFullList({
						filter: `team = "${reserveFemaleTeam.id}" && golfer = "${golfer.id}"`
					});

					if (existing.length === 0) {
						await pb.collection('team_golfers').create({
							team: reserveFemaleTeam.id,
							golfer: golfer.id,
							position: 'reserve'
						});
						console.log(`    ✓ ${golfer.name} (#${golfer.world_ranking})`);
						assigned++;
					}
				} catch (err: any) {
					console.log(`    ❌ Error: ${err.message}`);
				}
			}
		}

		console.log('\n✅ Assignment completed!');
		console.log(`  Total assignments: ${assigned}\n`);

		// Show summary
		const allAssignments = await pb.collection('team_golfers').getFullList({
			expand: 'team,golfer'
		});

		console.log('📊 Assignment Summary:\n');
		const teamMap = new Map();
		
		for (const assignment of allAssignments) {
			const teamId = assignment.team || 'Unknown';
			if (!teamMap.has(teamId)) {
				teamMap.set(teamId, []);
			}
			teamMap.get(teamId).push(assignment);
		}

		for (const [teamName, assignments] of teamMap.entries()) {
			console.log(`  Team ${teamName}:`);
			assignments.forEach((a: any) => {
				const golferName = a.expand?.golfer?.name || 'Unknown';
				const gender = a.expand?.golfer?.gender || '?';
				const ranking = a.expand?.golfer?.world_ranking || '?';
				const position = a.position || 'starter';
				console.log(`    - ${golferName} (${gender}, #${ranking}) [${position}]`);
			});
		}

		console.log(`\nTotal: ${allAssignments.length} golfer assignments\n`);

	} catch (error: any) {
		console.error('\n❌ Error:', error.message);
		if (error.data) {
			console.error('Details:', JSON.stringify(error.data, null, 2));
		}
		process.exit(1);
	}
}

assignGolfersToTeams();
