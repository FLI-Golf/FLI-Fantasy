/**
 * Tournament Finalization Script
 * 
 * Usage: pnpm tsx scripts/finalize-tournament.ts [--force]
 * 
 * This script:
 * 1. Checks if the tournament is complete (all golfers finished)
 * 2. Awards prizes to top fantasy teams
 * 3. Updates season standings
 * 4. Marks the tournament as completed
 */

import PocketBase from 'pocketbase';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { TournamentFinalizationService } from '../src/lib/services/tournamentFinalizationService';

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
	const force = process.argv.includes('--force');

	console.log('🏆 Tournament Finalization Script');
	console.log('================================\n');

	// Authenticate
	console.log('🔐 Authenticating...');
	await pb.admins.authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD);
	console.log('✅ Authenticated\n');

	// Find the current tournament (FLI Masters Championship)
	console.log('🔍 Finding tournament...');
	const tournaments = await pb.collection('tournaments').getFullList({
		filter: 'status = "next" || status = "in_progress"',
		sort: 'start_date'
	});

	if (tournaments.length === 0) {
		console.log('❌ No active tournament found');
		return;
	}

	const tournament = tournaments[0];
	console.log(`   Found: ${tournament.name} (ID: ${tournament.id})`);
	console.log(`   Status: ${tournament.status}\n`);

	// Find the fantasy tournament linked to this tournament
	console.log('🔍 Finding fantasy tournament...');
	
	// Get all fantasy tournaments and find one with completed draft
	const allFantasyTournaments = await pb.collection('fantasy_tournament').getFullList({
		sort: '-created'
	});
	
	// Find one that matches the tournament or has a completed draft
	let fantasyTournament = allFantasyTournaments.find(ft => 
		ft.tournament === tournament.id
	);
	
	if (!fantasyTournament) {
		// Try to find by title containing tournament name or with completed draft
		fantasyTournament = allFantasyTournaments.find(ft => 
			(ft.title && ft.title.includes('Masters')) || 
			ft.draft_status === 'completed'
		);
	}

	if (!fantasyTournament) {
		console.log('❌ No fantasy tournament found');
		return;
	}

	console.log(`   Found: ${fantasyTournament.title || fantasyTournament.id}`);
	console.log(`   Draft Status: ${fantasyTournament.draft_status || 'unknown'}`);
	console.log(`   League ID: ${fantasyTournament.fantasy_league}\n`);

	// Initialize the service
	const service = new TournamentFinalizationService(pb);

	// Check completion status first
	console.log('📊 Checking tournament completion...');
	const completion = await service.checkTournamentCompletion(tournament.id);
	console.log(`   Total Holes: ${completion.totalHoles}`);
	console.log(`   Total Golfers: ${completion.totalGolfers}`);
	console.log(`   Completed Golfers: ${completion.completedGolfers}`);
	console.log(`   Is Complete: ${completion.isComplete ? '✅ Yes' : '❌ No'}`);
	console.log(`   Reason: ${completion.reason}\n`);

	if (!completion.isComplete && !force) {
		console.log('⚠️  Tournament is not complete. Use --force to finalize anyway.');
		return;
	}

	if (force && !completion.isComplete) {
		console.log('⚠️  Forcing finalization despite incomplete tournament...\n');
	}

	// Run full finalization
	console.log('🚀 Running finalization...\n');
	const result = await service.finalizeTournament(
		tournament.id,
		fantasyTournament.id,
		fantasyTournament.fantasy_league,
		{ force }
	);

	// Report results
	console.log('📋 RESULTS');
	console.log('==========\n');

	console.log('🏅 Prize Awards:');
	if (result.prizes.awardsGiven.length > 0) {
		for (const award of result.prizes.awardsGiven) {
			console.log(`   Position ${award.position}: User ${award.userId} - ${award.points} points`);
		}
	} else {
		console.log('   No prizes awarded');
	}
	if (result.prizes.errors.length > 0) {
		console.log('   Errors:');
		result.prizes.errors.forEach(e => console.log(`     - ${e}`));
	}
	console.log();

	console.log('📊 Season Standings:');
	if (result.standings.updatedParticipants.length > 0) {
		for (const p of result.standings.updatedParticipants) {
			console.log(`   User ${p.userId}: ${p.totalPoints} total points`);
		}
	} else {
		console.log('   No participants updated');
	}
	if (result.standings.errors.length > 0) {
		console.log('   Errors:');
		result.standings.errors.forEach(e => console.log(`     - ${e}`));
	}
	console.log();

	console.log('🏁 Tournament Status:');
	console.log(`   Updated to "completed": ${result.tournamentStatusUpdated ? '✅ Yes' : '❌ No'}\n`);

	console.log('🎉 Finalization complete!');
}

main().catch(err => {
	console.error('❌ Error:', err.message || err);
	process.exit(1);
});
