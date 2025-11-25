/**
 * PocketBase Collections Migration Script
 * 
 * This script creates all required collections in PocketBase programmatically.
 * Run with: pnpm tsx scripts/migrate-pocketbase.ts
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(POCKETBASE_URL);

async function authenticateAdmin() {
	console.log('🔐 Authenticating as admin...');
	if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
		throw new Error('Admin credentials not found in environment variables');
	}
	await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
	console.log('✅ Authenticated successfully\n');
}

async function createFantasySeasonsCollection() {
	console.log('📦 Creating fantasy_seasons collection...');
	
	try {
		const collection = await pb.collections.create({
			name: 'fantasy_seasons',
			type: 'base',
			listRule: null,
			viewRule: null,
			createRule: null,
			updateRule: null,
			deleteRule: null,
			schema: [
				{
					name: 'name',
					type: 'text',
					required: true,
					options: { min: 3, max: 100 }
				},
				{
					name: 'description',
					type: 'text',
					required: false,
					options: { max: 500 }
				},
				{
					name: 'owner',
					type: 'relation',
					required: true,
					options: {
						collectionId: 'users',
						cascadeDelete: false,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['name', 'email']
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
			]
		});
		
		// Update with basic API rules (can be refined later in PocketBase admin)
		await pb.collections.update(collection.id, {
			listRule: '@request.auth.id != ""',
			viewRule: '@request.auth.id != ""',
			createRule: '@request.auth.id != ""',
			updateRule: '@request.auth.id != ""',
			deleteRule: '@request.auth.id != ""'
		});
		
		console.log('✅ fantasy_seasons created\n');
	} catch (error: any) {
		if (error.status === 400) {
			console.log('⚠️  fantasy_seasons already exists, skipping\n');
		} else {
			throw error;
		}
	}
}

async function createFantasySeasonParticipantsCollection() {
	console.log('📦 Creating fantasy_season_participants collection...');
	
	try {
		const collection = await pb.collections.create({
			name: 'fantasy_season_participants',
			type: 'base',
			listRule: null,
			viewRule: null,
			createRule: null,
			updateRule: null,
			deleteRule: null,
			schema: [
				{
					name: 'season',
					type: 'relation',
					required: true,
					options: {
						collectionId: 'fantasy_seasons',
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
						collectionId: 'users',
						cascadeDelete: false,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['name', 'email']
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
			]
		});
		
		// Update with basic API rules and indexes
		await pb.collections.update(collection.id, {
			listRule: '@request.auth.id != ""',
			viewRule: '@request.auth.id != ""',
			createRule: '@request.auth.id != ""',
			updateRule: '@request.auth.id != ""',
			deleteRule: '@request.auth.id != ""',
			indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_season_user ON fantasy_season_participants (season, user)']
		});
		
		console.log('✅ fantasy_season_participants created\n');
	} catch (error: any) {
		if (error.status === 400) {
			console.log('⚠️  fantasy_season_participants already exists, skipping\n');
		} else {
			throw error;
		}
	}
}

async function createGolfersCollection() {
	console.log('📦 Creating golfers collection...');
	
	try {
		await pb.collections.create({
			name: 'golfers',
			type: 'base',
			schema: [
				{
					name: 'name',
					type: 'text',
					required: true,
					options: { min: 2, max: 100 }
				},
				{
					name: 'country',
					type: 'text',
					required: false,
					options: { max: 3 }
				},
				{
					name: 'world_ranking',
					type: 'number',
					required: false,
					options: { min: 1 }
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
					name: 'external_id',
					type: 'text',
					required: false,
					options: { max: 100 }
				}
			]
		});
		console.log('✅ golfers created (rules can be configured in admin UI)\n');
	} catch (error: any) {
		if (error.status === 400) {
			console.log('⚠️  golfers already exists, skipping\n');
		} else {
			throw error;
		}
	}
}

async function createTournamentsCollection() {
	console.log('📦 Creating tournaments collection...');
	
	try {
		await pb.collections.create({
			name: 'tournaments',
			type: 'base',
			schema: [
				{
					name: 'name',
					type: 'text',
					required: true,
					options: { min: 3, max: 200 }
				},
				{
					name: 'season',
					type: 'relation',
					required: true,
					options: {
						collectionId: 'fantasy_seasons',
						cascadeDelete: true,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['name']
					}
				},
				{
					name: 'start_date',
					type: 'date',
					required: true
				},
				{
					name: 'end_date',
					type: 'date',
					required: true
				},
				{
					name: 'location',
					type: 'text',
					required: false,
					options: { max: 200 }
				},
				{
					name: 'status',
					type: 'select',
					required: true,
					options: {
						maxSelect: 1,
						values: ['upcoming', 'in_progress', 'completed']
					}
				},
				{
					name: 'external_id',
					type: 'text',
					required: false,
					options: { max: 100 }
				}
			]
		});
		console.log('✅ tournaments created (rules can be configured in admin UI)\n');
	} catch (error: any) {
		if (error.status === 400) {
			console.log('⚠️  tournaments already exists, skipping\n');
		} else {
			throw error;
		}
	}
}

async function createTournamentRoundsCollection() {
	console.log('📦 Creating tournament_rounds collection...');
	
	try {
		await pb.collections.create({
			name: 'tournament_rounds',
			type: 'base',
			schema: [
				{
					name: 'tournament',
					type: 'relation',
					required: true,
					options: {
						collectionId: 'tournaments',
						cascadeDelete: true,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['name']
					}
				},
				{
					name: 'round_number',
					type: 'number',
					required: true,
					options: { min: 1, max: 4 }
				},
				{
					name: 'date',
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
		
		// Add indexes after creation
		await pb.collections.update('tournament_rounds', {
			indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_round ON tournament_rounds (tournament, round_number)']
		});
		
		console.log('✅ tournament_rounds created (rules can be configured in admin UI)\n');
	} catch (error: any) {
		if (error.status === 400) {
			console.log('⚠️  tournament_rounds already exists, skipping\n');
		} else {
			throw error;
		}
	}
}

async function createGolferScoresCollection() {
	console.log('📦 Creating golfer_scores collection...');
	
	try {
		await pb.collections.create({
			name: 'golfer_scores',
			type: 'base',
			schema: [
				{
					name: 'tournament_round',
					type: 'relation',
					required: true,
					options: {
						collectionId: 'tournament_rounds',
						cascadeDelete: true,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['round_number']
					}
				},
				{
					name: 'golfer',
					type: 'relation',
					required: true,
					options: {
						collectionId: 'golfers',
						cascadeDelete: false,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['name']
					}
				},
				{
					name: 'score',
					type: 'number',
					required: false
				},
				{
					name: 'total_strokes',
					type: 'number',
					required: false,
					options: { min: 0 }
				},
				{
					name: 'position',
					type: 'number',
					required: false,
					options: { min: 1 }
				},
				{
					name: 'is_cut',
					type: 'bool',
					required: true
				}
			]
		});
		
		// Add indexes after creation
		await pb.collections.update('golfer_scores', {
			indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_round_golfer ON golfer_scores (tournament_round, golfer)']
		});
		
		console.log('✅ golfer_scores created (rules can be configured in admin UI)\n');
	} catch (error: any) {
		if (error.status === 400) {
			console.log('⚠️  golfer_scores already exists, skipping\n');
		} else {
			throw error;
		}
	}
}

async function createDraftPicksCollection() {
	console.log('📦 Creating draft_picks collection...');
	
	try {
		await pb.collections.create({
			name: 'draft_picks',
			type: 'base',
			schema: [
				{
					name: 'season',
					type: 'relation',
					required: true,
					options: {
						collectionId: 'fantasy_seasons',
						cascadeDelete: true,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['name']
					}
				},
				{
					name: 'participant',
					type: 'relation',
					required: true,
					options: {
						collectionId: 'fantasy_season_participants',
						cascadeDelete: true,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['user']
					}
				},
				{
					name: 'golfer',
					type: 'relation',
					required: true,
					options: {
						collectionId: 'golfers',
						cascadeDelete: false,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['name']
					}
				},
				{
					name: 'pick_number',
					type: 'number',
					required: true,
					options: { min: 1 }
				},
				{
					name: 'round_number',
					type: 'number',
					required: true,
					options: { min: 1 }
				},
				{
					name: 'picked_at',
					type: 'date',
					required: true
				}
			]
		});
		
		// Add indexes after creation
		await pb.collections.update('draft_picks', {
			indexes: [
				'CREATE UNIQUE INDEX IF NOT EXISTS idx_season_pick ON draft_picks (season, pick_number)',
				'CREATE UNIQUE INDEX IF NOT EXISTS idx_season_golfer ON draft_picks (season, golfer)'
			]
		});
		
		console.log('✅ draft_picks created (rules can be configured in admin UI)\n');
	} catch (error: any) {
		if (error.status === 400) {
			console.log('⚠️  draft_picks already exists, skipping\n');
		} else {
			throw error;
		}
	}
}

async function createRostersCollection() {
	console.log('📦 Creating rosters collection...');
	
	try {
		await pb.collections.create({
			name: 'rosters',
			type: 'base',
			schema: [
				{
					name: 'tournament',
					type: 'relation',
					required: true,
					options: {
						collectionId: 'tournaments',
						cascadeDelete: true,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['name']
					}
				},
				{
					name: 'participant',
					type: 'relation',
					required: true,
					options: {
						collectionId: 'fantasy_season_participants',
						cascadeDelete: true,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['user']
					}
				},
				{
					name: 'golfer',
					type: 'relation',
					required: true,
					options: {
						collectionId: 'golfers',
						cascadeDelete: false,
						minSelect: null,
						maxSelect: 1,
						displayFields: ['name']
					}
				},
				{
					name: 'is_active',
					type: 'bool',
					required: true
				},
				{
					name: 'points_earned',
					type: 'number',
					required: false,
					options: { min: 0 }
				}
			]
		});
		
		// Add indexes after creation
		await pb.collections.update('rosters', {
			indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_participant_golfer ON rosters (tournament, participant, golfer)']
		});
		
		console.log('✅ rosters created (rules can be configured in admin UI)\n');
	} catch (error: any) {
		if (error.status === 400) {
			console.log('⚠️  rosters already exists, skipping\n');
		} else {
			throw error;
		}
	}
}

async function updateUsersCollection() {
	console.log('📦 Updating users collection with name field...');
	
	try {
		// Get all collections and find the users auth collection
		const collections = await pb.collections.getFullList();
		const usersCollection = collections.find((c: any) => c.type === 'auth');
		
		if (!usersCollection) {
			console.log('⚠️  Users collection not found, skipping\n');
			return;
		}
		
		// Check if name field already exists
		const hasNameField = usersCollection.schema?.some((field: any) => field.name === 'name');
		
		if (hasNameField) {
			console.log('⚠️  name field already exists in users collection, skipping\n');
			return;
		}
		
		// Add name field to schema
		const updatedSchema = [
			...(usersCollection.schema || []),
			{
				name: 'name',
				type: 'text',
				required: true,
				options: { min: 2, max: 100 }
			}
		];
		
		await pb.collections.update(usersCollection.id, {
			schema: updatedSchema
		});
		
		console.log('✅ users collection updated with name field\n');
	} catch (error: any) {
		console.error('❌ Error updating users collection:', error.message);
		console.log('⚠️  Continuing with other collections...\n');
	}
}

async function main() {
	try {
		console.log('🚀 Starting PocketBase migration...\n');
		console.log(`📍 Target: ${POCKETBASE_URL}\n`);
		
		await authenticateAdmin();
		
		// Update existing collections
		await updateUsersCollection();
		
		// Create new collections
		await createFantasySeasonsCollection();
		await createFantasySeasonParticipantsCollection();
		await createGolfersCollection();
		await createTournamentsCollection();
		await createTournamentRoundsCollection();
		await createGolferScoresCollection();
		await createDraftPicksCollection();
		await createRostersCollection();
		
		console.log('✅ Migration completed successfully!');
		console.log('\n📊 Summary:');
		console.log('   - Updated: users (added name field)');
		console.log('   - Created: 8 new collections');
		console.log('\n🎉 Your PocketBase database is ready!');
		
	} catch (error: any) {
		console.error('\n❌ Migration failed:', error.message);
		if (error.data) {
			console.error('Details:', JSON.stringify(error.data, null, 2));
		}
		process.exit(1);
	}
}

main();
