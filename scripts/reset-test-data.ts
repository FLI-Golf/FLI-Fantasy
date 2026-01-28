/**
 * Reset Test Data Script
 * 
 * Usage: pnpm tsx scripts/reset-test-data.ts [--confirm]
 * 
 * This script resets all test/transactional data while preserving core data:
 * 
 * DELETED (transactional data):
 * - golfer_scores (all scoring data)
 * - fantasy_draft_picks (all draft picks)
 * - fantasy_team (all fantasy teams)
 * - fantasy_season_results (archived results)
 * - fantasy_prize (tournament prizes)
 * - live_pro_scores (live scoring data)
 * 
 * RESET (zeroed out):
 * - fantasy_season_participants.total_points -> 0
 * - fantasy_tournament.draft_status -> 'pending'
 * - tournaments.status -> 'upcoming'
 * 
 * PRESERVED (core data):
 * - users, user_profile
 * - golfers
 * - tournaments (structure only, status reset)
 * - courses, holes
 * - fantasy_league
 * - fantasy_season_participants (membership preserved, points zeroed)
 * - fantasy_tournament (structure preserved, draft reset)
 * - products, orders (shop data)
 * - sponsors
 * - ticker_items
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

// Collections to completely clear
const COLLECTIONS_TO_CLEAR = [
	'golfer_scores',
	'fantasy_draft_picks',
	'fantasy_team',
	'fantasy_season_results',
	'fantasy_prize',
	'live_pro_scores'
];

async function clearCollection(collectionName: string): Promise<number> {
	try {
		const records = await pb.collection(collectionName).getFullList();
		let deleted = 0;
		
		for (const record of records) {
			try {
				await pb.collection(collectionName).delete(record.id);
				deleted++;
			} catch (err: any) {
				console.log(`     Warning: Could not delete ${record.id}: ${err.message}`);
			}
		}
		
		return deleted;
	} catch (err: any) {
		if (err.status === 404) {
			console.log(`     Collection ${collectionName} not found, skipping`);
			return 0;
		}
		throw err;
	}
}

async function resetParticipantPoints(): Promise<number> {
	const participants = await pb.collection('fantasy_season_participants').getFullList();
	let updated = 0;
	
	for (const p of participants) {
		if (p.total_points !== 0) {
			await pb.collection('fantasy_season_participants').update(p.id, {
				total_points: 0
			});
			updated++;
		}
	}
	
	return updated;
}

async function resetFantasyTournaments(): Promise<number> {
	const tournaments = await pb.collection('fantasy_tournament').getFullList();
	let updated = 0;
	
	for (const t of tournaments) {
		if (t.draft_status !== 'pending') {
			await pb.collection('fantasy_tournament').update(t.id, {
				draft_status: 'pending'
			});
			updated++;
		}
	}
	
	return updated;
}

async function resetTournamentStatus(): Promise<number> {
	const tournaments = await pb.collection('tournaments').getFullList();
	let updated = 0;
	
	for (const t of tournaments) {
		if (t.status !== 'upcoming') {
			await pb.collection('tournaments').update(t.id, {
				status: 'upcoming'
			});
			updated++;
		}
	}
	
	return updated;
}

async function main() {
	const confirmed = process.argv.includes('--confirm');

	console.log('🔄 Reset Test Data Script');
	console.log('=========================\n');

	if (!confirmed) {
		console.log('⚠️  WARNING: This will delete all test/transactional data!');
		console.log('');
		console.log('Collections to be CLEARED:');
		COLLECTIONS_TO_CLEAR.forEach(c => console.log(`   - ${c}`));
		console.log('');
		console.log('Data to be RESET:');
		console.log('   - fantasy_season_participants.total_points -> 0');
		console.log('   - fantasy_tournament.draft_status -> pending');
		console.log('   - tournaments.status -> upcoming');
		console.log('');
		console.log('To proceed, run with --confirm flag:');
		console.log('   pnpm tsx scripts/reset-test-data.ts --confirm');
		console.log('');
		return;
	}

	// Authenticate
	console.log('🔐 Authenticating...');
	await pb.admins.authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD);
	console.log('✅ Authenticated\n');

	// Clear collections
	console.log('🗑️  Clearing transactional collections...');
	for (const collection of COLLECTIONS_TO_CLEAR) {
		const count = await clearCollection(collection);
		console.log(`   ${collection}: ${count} records deleted`);
	}
	console.log('');

	// Reset participant points
	console.log('📊 Resetting participant points...');
	const participantsReset = await resetParticipantPoints();
	console.log(`   ${participantsReset} participants reset to 0 points\n`);

	// Reset fantasy tournament draft status
	console.log('🎯 Resetting fantasy tournament draft status...');
	const fantasyTournamentsReset = await resetFantasyTournaments();
	console.log(`   ${fantasyTournamentsReset} fantasy tournaments reset to pending\n`);

	// Reset tournament status
	console.log('🏆 Resetting tournament status...');
	const tournamentsReset = await resetTournamentStatus();
	console.log(`   ${tournamentsReset} tournaments reset to upcoming\n`);

	console.log('✅ Reset complete!');
	console.log('');
	console.log('You can now:');
	console.log('   1. Start a new draft');
	console.log('   2. Enter scores');
	console.log('   3. Finalize tournaments');
	console.log('');
}

main().catch(err => {
	console.error('❌ Error:', err.message || err);
	process.exit(1);
});
