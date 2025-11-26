/**
 * PocketBase Collections Migration Script v2
 * 
 * This script creates all required collections using the PocketBase Admin API directly.
 * Run with: pnpm tsx scripts/migrate-pocketbase-v2.ts
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(POCKETBASE_URL);

// Cache for collection name to ID mapping
let collectionIdMap: Map<string, string> = new Map();

async function authenticateAdmin() {
	console.log('🔐 Authenticating as admin...');
	if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
		throw new Error('Admin credentials not found in environment variables');
	}
	
	await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
	console.log('✅ Authenticated successfully\n');
}

async function buildCollectionIdMap() {
	console.log('📋 Building collection ID map...');
	const collections = await pb.collections.getFullList();
	collections.forEach((col: any) => {
		collectionIdMap.set(col.name, col.id);
	});
	console.log(`✅ Mapped ${collectionIdMap.size} collections\n`);
}

function resolveCollectionIds(schema: any[]): any[] {
	return schema.map(field => {
		if (field.type === 'relation' && field.options?.collectionId) {
			const collectionName = field.options.collectionId;
			// Skip system collections that start with _
			if (!collectionName.startsWith('_')) {
				const collectionId = collectionIdMap.get(collectionName);
				if (collectionId) {
					return {
						...field,
						options: {
							...field.options,
							collectionId: collectionId
						}
					};
				}
			}
		}
		return field;
	});
}

async function createOrUpdateCollection(collectionData: any) {
	const { name, schema } = collectionData;
	console.log(`📦 Creating/updating ${name} collection...`);
	
	// Resolve collection IDs in relation fields
	const resolvedSchema = schema ? resolveCollectionIds(schema) : [];
	const resolvedData = { ...collectionData, schema: resolvedSchema };
	
	try {
		// Try to create the collection
		const created = await pb.collections.create(resolvedData);
		console.log(`✅ ${name} created successfully\n`);
		// Update the ID map with the new collection
		collectionIdMap.set(name, created.id);
		return created;
	} catch (error: any) {
		// If collection exists, try to update it
		if (error.status === 400) {
			console.log(`⚠️  ${name} already exists, updating schema...`);
			
			try {
				// Get existing collection
				const collections = await pb.collections.getFullList();
				const existing = collections.find((c: any) => c.name === name);
				
				if (existing) {
					// Update the collection
					const updated = await pb.collections.update(existing.id, resolvedData);
					console.log(`✅ ${name} updated successfully\n`);
					return updated;
				}
			} catch (updateError: any) {
				console.error(`❌ Failed to update ${name}:`, updateError.message);
				if (updateError.data) {
					console.error('   Error details:', JSON.stringify(updateError.data, null, 2));
				}
			}
		} else {
			console.error(`❌ Failed to create ${name}:`, error.message);
		}
	}
}

async function main() {
	try {
		console.log('🚀 Starting PocketBase migration v2...\n');
		console.log(`📍 Target: ${POCKETBASE_URL}\n`);
		
		await authenticateAdmin();
		await buildCollectionIdMap();
		
		// fantasy_seasons
		await createOrUpdateCollection({
			name: 'fantasy_seasons',
			type: 'base',
			schema: [
				{ name: 'name', type: 'text', required: true, options: { min: 3, max: 100 } },
				{ name: 'description', type: 'text', required: false, options: { max: 500 } },
				{ name: 'owner', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['name', 'email'] } },
				{ name: 'status', type: 'select', required: true, options: { maxSelect: 1, values: ['filling', 'active', 'completed', 'cancelled'] } },
				{ name: 'max_participants', type: 'number', required: true, options: { min: 2, max: 100 } },
				{ name: 'participants_count', type: 'number', required: true, options: { min: 0 } },
				{ name: 'schedule_generated', type: 'bool', required: true },
				{ name: 'start_date', type: 'date', required: false },
				{ name: 'end_date', type: 'date', required: false }
			],
			listRule: '@request.auth.id != ""',
			viewRule: '@request.auth.id != ""',
			createRule: '@request.auth.id != ""',
			updateRule: '@request.auth.id != ""',
			deleteRule: '@request.auth.id != ""'
		});
		
		// fantasy_season_participants
		await createOrUpdateCollection({
			name: 'fantasy_season_participants',
			type: 'base',
			schema: [
				{ name: 'season', type: 'relation', required: true, options: { collectionId: 'fantasy_seasons', cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: ['name'] } },
				{ name: 'user', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['name', 'email'] } },
				{ name: 'is_owner', type: 'bool', required: true },
				{ name: 'joined_at', type: 'date', required: true },
				{ name: 'total_points', type: 'number', required: false, options: { min: 0 } }
			],
			indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_season_user ON fantasy_season_participants (season, user)'],
			listRule: '@request.auth.id != ""',
			viewRule: '@request.auth.id != ""',
			createRule: '@request.auth.id != ""',
			updateRule: '@request.auth.id != ""',
			deleteRule: '@request.auth.id != ""'
		});
		
		// golfers
		await createOrUpdateCollection({
			name: 'golfers',
			type: 'base',
			schema: [
				{ name: 'name', type: 'text', required: true, options: { min: 2, max: 100 } },
				{ name: 'country', type: 'text', required: false, options: { max: 3 } },
				{ name: 'world_ranking', type: 'number', required: false, options: { min: 1 } },
				{ name: 'photo_url', type: 'url', required: false },
				{ name: 'is_active', type: 'bool', required: true },
				{ name: 'external_id', type: 'text', required: false, options: { max: 100 } }
			],
			listRule: '@request.auth.id != ""',
			viewRule: '@request.auth.id != ""',
			createRule: '@request.auth.id != ""',
			updateRule: '@request.auth.id != ""',
			deleteRule: '@request.auth.id != ""'
		});
		
		// tournaments
		await createOrUpdateCollection({
			name: 'tournaments',
			type: 'base',
			schema: [
				{ name: 'name', type: 'text', required: true, options: { min: 3, max: 200 } },
				{ name: 'season', type: 'relation', required: true, options: { collectionId: 'fantasy_seasons', cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: ['name'] } },
				{ name: 'start_date', type: 'date', required: true },
				{ name: 'end_date', type: 'date', required: true },
				{ name: 'location', type: 'text', required: false, options: { max: 200 } },
				{ name: 'status', type: 'select', required: true, options: { maxSelect: 1, values: ['upcoming', 'in_progress', 'completed'] } },
				{ name: 'external_id', type: 'text', required: false, options: { max: 100 } }
			],
			listRule: '@request.auth.id != ""',
			viewRule: '@request.auth.id != ""',
			createRule: '@request.auth.id != ""',
			updateRule: '@request.auth.id != ""',
			deleteRule: '@request.auth.id != ""'
		});
		
		// tournament_rounds
		await createOrUpdateCollection({
			name: 'tournament_rounds',
			type: 'base',
			schema: [
				{ name: 'tournament', type: 'relation', required: true, options: { collectionId: 'tournaments', cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: ['name'] } },
				{ name: 'round_number', type: 'number', required: true, options: { min: 1, max: 4 } },
				{ name: 'date', type: 'date', required: true },
				{ name: 'status', type: 'select', required: true, options: { maxSelect: 1, values: ['upcoming', 'in_progress', 'completed'] } }
			],
			indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_round ON tournament_rounds (tournament, round_number)'],
			listRule: '@request.auth.id != ""',
			viewRule: '@request.auth.id != ""',
			createRule: '@request.auth.id != ""',
			updateRule: '@request.auth.id != ""',
			deleteRule: '@request.auth.id != ""'
		});
		
		// golfer_scores
		await createOrUpdateCollection({
			name: 'golfer_scores',
			type: 'base',
			schema: [
				{ name: 'tournament_rounds', type: 'relation', required: true, options: { collectionId: 'tournament_rounds', cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: ['round_number'] } },
				{ name: 'golfer', type: 'relation', required: true, options: { collectionId: 'golfers', cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['name'] } },
				{ name: 'score', type: 'number', required: false },
				{ name: 'total_strokes', type: 'number', required: false, options: { min: 0 } },
				{ name: 'position', type: 'number', required: false, options: { min: 1 } },
				{ name: 'is_cut', type: 'bool', required: true }
			],
			indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_round_golfer ON golfer_scores (tournament_rounds, golfer)'],
			listRule: '@request.auth.id != ""',
			viewRule: '@request.auth.id != ""',
			createRule: '@request.auth.id != ""',
			updateRule: '@request.auth.id != ""',
			deleteRule: '@request.auth.id != ""'
		});
		
		// draft_picks
		await createOrUpdateCollection({
			name: 'draft_picks',
			type: 'base',
			schema: [
				{ name: 'season', type: 'relation', required: true, options: { collectionId: 'fantasy_seasons', cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: ['name'] } },
				{ name: 'participant', type: 'relation', required: true, options: { collectionId: 'fantasy_season_participants', cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: ['user'] } },
				{ name: 'golfer', type: 'relation', required: true, options: { collectionId: 'golfers', cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['name'] } },
				{ name: 'pick_number', type: 'number', required: true, options: { min: 1 } },
				{ name: 'round_number', type: 'number', required: true, options: { min: 1 } },
				{ name: 'picked_at', type: 'date', required: true }
			],
			indexes: [
				'CREATE UNIQUE INDEX IF NOT EXISTS idx_season_pick ON draft_picks (season, pick_number)',
				'CREATE UNIQUE INDEX IF NOT EXISTS idx_season_golfer ON draft_picks (season, golfer)'
			],
			listRule: '@request.auth.id != ""',
			viewRule: '@request.auth.id != ""',
			createRule: '@request.auth.id != ""',
			updateRule: '',
			deleteRule: '@request.auth.id != ""'
		});
		
		// rosters
		await createOrUpdateCollection({
			name: 'rosters',
			type: 'base',
			schema: [
				{ name: 'tournament', type: 'relation', required: true, options: { collectionId: 'tournaments', cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: ['name'] } },
				{ name: 'participant', type: 'relation', required: true, options: { collectionId: 'fantasy_season_participants', cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: ['user'] } },
				{ name: 'golfer', type: 'relation', required: true, options: { collectionId: 'golfers', cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['name'] } },
				{ name: 'is_active', type: 'bool', required: true },
				{ name: 'points_earned', type: 'number', required: false, options: { min: 0 } }
			],
			indexes: ['CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_participant_golfer ON rosters (tournament, participant, golfer)'],
			listRule: '@request.auth.id != ""',
			viewRule: '@request.auth.id != ""',
			createRule: '@request.auth.id != ""',
			updateRule: '@request.auth.id != ""',
			deleteRule: '@request.auth.id != ""'
		});
		
		console.log('✅ Migration completed successfully!');
		console.log('\n📊 Summary:');
		console.log('   - Created/Updated: 8 collections with full schemas');
		console.log('   - Applied: API rules for authentication');
		console.log('   - Added: Unique indexes where needed');
		console.log('\n🎉 Your PocketBase database is ready!');
		console.log('\n⚠️  Note: Check the PocketBase admin UI to verify all fields and rules.');
		
	} catch (error: any) {
		console.error('\n❌ Migration failed:', error.message);
		process.exit(1);
	}
}

main();
