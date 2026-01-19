/**
 * Create fantasy_season_results collection in PocketBase
 */

import PocketBase from 'pocketbase';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env
const envPath = resolve(process.cwd(), '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
	const [key, ...valueParts] = line.split('=');
	if (key && valueParts.length) {
		env[key.trim()] = valueParts.join('=').trim();
	}
});

const pb = new PocketBase(env.VITE_POCKETBASE_URL);

async function main() {
	console.log('🔐 Authenticating...');
	await pb.admins.authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD);
	console.log('✅ Authenticated\n');

	// Check if collection already exists
	try {
		await pb.collections.getOne('fantasy_season_results');
		console.log('⚠️  fantasy_season_results collection already exists');
		return;
	} catch (err: any) {
		if (err.status !== 404) {
			throw err;
		}
	}

	console.log('📦 Creating fantasy_season_results collection...');

	// Get the users collection ID for relation
	const usersCollection = await pb.collections.getOne('users');
	
	// Get fantasy_season_participants collection ID for league relation reference
	const participantsCollection = await pb.collections.getOne('fantasy_season_participants');
	
	// Find the league field to get the correct collection ID
	const leagueField = participantsCollection.fields?.find((f: any) => f.name === 'league');
	const leagueCollectionId = leagueField?.collectionId || 'pbc_806960330';

	const collection = await pb.collections.create({
		name: 'fantasy_season_results',
		type: 'base',
		listRule: '',
		viewRule: '',
		createRule: '@request.auth.id != ""',
		updateRule: '@request.auth.id != ""',
		deleteRule: '@request.auth.id != ""',
		fields: [
			{
				name: 'league',
				type: 'relation',
				required: true,
				collectionId: leagueCollectionId,
				cascadeDelete: false,
				maxSelect: 1
			},
			{
				name: 'season',
				type: 'select',
				required: true,
				values: ['2025', '2026', '2027', '2028'],
				maxSelect: 1
			},
			{
				name: 'user',
				type: 'relation',
				required: true,
				collectionId: usersCollection.id,
				cascadeDelete: false,
				maxSelect: 1
			},
			{
				name: 'final_rank',
				type: 'number',
				required: true,
				min: 1,
				onlyInt: true
			},
			{
				name: 'total_points',
				type: 'number',
				required: true,
				min: 0,
				onlyInt: true
			},
			{
				name: 'tournaments_played',
				type: 'number',
				required: false,
				min: 0,
				onlyInt: true
			},
			{
				name: 'tournament_wins',
				type: 'number',
				required: false,
				min: 0,
				onlyInt: true
			},
			{
				name: 'prize_type',
				type: 'select',
				required: false,
				values: ['store_credit', 'merch', 'cash', 'trophy', 'custom'],
				maxSelect: 1
			},
			{
				name: 'prize_value',
				type: 'number',
				required: false,
				min: 0
			},
			{
				name: 'prize_description',
				type: 'text',
				required: false,
				max: 500
			},
			{
				name: 'prize_claimed',
				type: 'bool',
				required: false
			},
			{
				name: 'prize_claimed_at',
				type: 'date',
				required: false
			},
			{
				name: 'store_credit_code',
				type: 'text',
				required: false,
				max: 50
			},
			{
				name: 'tournament_results',
				type: 'json',
				required: false
			},
			{
				name: 'finalized_at',
				type: 'date',
				required: false
			}
		]
	});

	console.log('✅ Collection created:', collection.id);
	console.log('\n📋 Fields:');
	collection.fields?.forEach((f: any) => {
		console.log(`   - ${f.name} (${f.type})`);
	});

	console.log('\n🎉 Done!');
}

main().catch(err => {
	console.error('❌ Error:', err.message || err);
	process.exit(1);
});
