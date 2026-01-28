/**
 * Reset to Draft-Ready State
 * 
 * Usage: pnpm tsx scripts/reset-to-draft-ready.ts [--confirm]
 * 
 * This script resets everything to a clean state ready for a new draft:
 * 
 * 1. Clears all transactional data:
 *    - golfer_scores
 *    - fantasy_draft_picks
 *    - fantasy_team
 *    - fantasy_season_results
 *    - fantasy_prize
 *    - live_pro_scores
 * 
 * 2. Resets fantasy tournaments:
 *    - draft_status -> 'pending'
 *    - status -> 'next' (for first tournament) or '' (for others)
 *    - Clears draft_results
 *    - Resets all golfers in draft_managment to not drafted
 * 
 * 3. Resets participant points to 0
 * 
 * 4. Resets tournament status to 'upcoming'
 * 
 * Run without --confirm to see what will be affected.
 * Run with --confirm to execute the reset.
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

async function resetFantasyTournaments(): Promise<number> {
	const tournaments = await pb.collection('fantasy_tournament').getFullList({ sort: 'title' });
	let updated = 0;
	let isFirst = true;
	
	for (const t of tournaments) {
		// Reset draft_management to mark all golfers as not drafted
		let draftMgmt = t.draft_managment;
		if (draftMgmt && draftMgmt.available_golfers) {
			draftMgmt.available_golfers = draftMgmt.available_golfers.map((g: any) => ({
				...g,
				drafted: false,
				drafted_by: null
			}));
			draftMgmt.current_pick = 0;
			draftMgmt.current_round = 1;
		}
		
		await pb.collection('fantasy_tournament').update(t.id, {
			draft_status: 'pending',
			status: isFirst ? 'next' : '',
			draft_managment: draftMgmt,
			draft_results: {}
		});
		
		updated++;
		isFirst = false;
	}
	
	return updated;
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

	console.log('🔄 Reset to Draft-Ready State');
	console.log('==============================\n');

	if (!confirmed) {
		console.log('⚠️  WARNING: This will reset ALL test/transactional data!\n');
		console.log('Collections to be CLEARED:');
		COLLECTIONS_TO_CLEAR.forEach(c => console.log(`   - ${c}`));
		console.log('');
		console.log('Data to be RESET:');
		console.log('   - fantasy_tournament.draft_status -> pending');
		console.log('   - fantasy_tournament.status -> next (first) or empty');
		console.log('   - fantasy_tournament.draft_results -> cleared');
		console.log('   - fantasy_tournament.draft_managment -> all golfers not drafted');
		console.log('   - fantasy_season_participants.total_points -> 0');
		console.log('   - tournaments.status -> upcoming');
		console.log('');
		console.log('To proceed, run with --confirm flag:');
		console.log('   pnpm tsx scripts/reset-to-draft-ready.ts --confirm');
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

	// Reset fantasy tournaments
	console.log('🎯 Resetting fantasy tournaments...');
	const fantasyTournamentsReset = await resetFantasyTournaments();
	console.log(`   ${fantasyTournamentsReset} fantasy tournaments reset to draft-ready state\n`);

	// Reset participant points
	console.log('📊 Resetting participant points...');
	const participantsReset = await resetParticipantPoints();
	console.log(`   ${participantsReset} participants reset to 0 points\n`);

	// Reset tournament status
	console.log('🏆 Resetting tournament status...');
	const tournamentsReset = await resetTournamentStatus();
	console.log(`   ${tournamentsReset} tournaments reset to upcoming\n`);

	console.log('✅ Reset complete!');
	console.log('');
	console.log('The system is now ready for:');
	console.log('   1. Starting a new draft');
	console.log('   2. Entering scores for all 18 holes');
	console.log('   3. Finalizing tournaments');
	console.log('');
}

main().catch(err => {
	console.error('❌ Error:', err.message || err);
	process.exit(1);
});
