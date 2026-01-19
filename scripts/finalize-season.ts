/**
 * Season Finalization Script
 * 
 * Usage: pnpm tsx scripts/finalize-season.ts <league_id> <season>
 * 
 * Example: pnpm tsx scripts/finalize-season.ts nzmh5mh8xam7sag 2026
 * 
 * This script:
 * 1. Calculates final rankings based on total_points
 * 2. Awards season prizes (store credit codes)
 * 3. Archives results to fantasy_season_results collection
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

// Default season prize configuration
const DEFAULT_PRIZE_CONFIG = [
	{
		position: 1,
		prize_type: 'store_credit' as const,
		prize_value: 100,
		prize_description: '$100 FLI Store Credit - Season Champion'
	},
	{
		position: 2,
		prize_type: 'store_credit' as const,
		prize_value: 50,
		prize_description: '$50 FLI Store Credit - Season Runner-up'
	},
	{
		position: 3,
		prize_type: 'store_credit' as const,
		prize_value: 25,
		prize_description: '$25 FLI Store Credit - Season Third Place'
	}
];

async function main() {
	const leagueId = process.argv[2];
	const season = process.argv[3];

	if (!leagueId || !season) {
		console.log('Usage: pnpm tsx scripts/finalize-season.ts <league_id> <season>');
		console.log('Example: pnpm tsx scripts/finalize-season.ts nzmh5mh8xam7sag 2026');
		process.exit(1);
	}

	console.log('🏆 Season Finalization Script');
	console.log('=============================\n');

	// Authenticate
	console.log('🔐 Authenticating...');
	await pb.admins.authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD);
	console.log('✅ Authenticated\n');

	// Show prize configuration
	console.log('🎁 Prize Configuration:');
	DEFAULT_PRIZE_CONFIG.forEach(p => {
		console.log(`   ${p.position}. ${p.prize_description}`);
	});
	console.log();

	// Initialize service
	const service = new TournamentFinalizationService(pb);

	// Run finalization
	console.log(`🚀 Finalizing season ${season} for league ${leagueId}...\n`);
	const result = await service.finalizeSeason(leagueId, season, DEFAULT_PRIZE_CONFIG);

	// Report results
	console.log('📋 RESULTS');
	console.log('==========\n');

	if (result.results.length > 0) {
		console.log('🏅 Final Standings:\n');
		console.log('Rank | Points | Wins | Tournaments | Prize | Store Credit Code');
		console.log('-----|--------|------|-------------|-------|------------------');
		
		for (const r of result.results) {
			const prizeStr = r.prizeValue ? `$${r.prizeValue}` : '-';
			const codeStr = r.storeCreditCode || '-';
			console.log(
				`  ${r.finalRank}  |  ${String(r.totalPoints).padStart(4)}  |  ${r.tournamentWins}   |     ${r.tournamentsPlayed}       | ${prizeStr.padStart(5)} | ${codeStr}`
			);
		}
		console.log();
	}

	if (result.errors.length > 0) {
		console.log('⚠️  Errors:');
		result.errors.forEach(e => console.log(`   - ${e}`));
		console.log();
	}

	if (result.success) {
		console.log('🎉 Season finalization complete!');
		console.log('\n📧 Store credit codes have been generated for prize winners.');
		console.log('   These can be used in the shop for merchandise purchases.');
	} else {
		console.log('❌ Season finalization failed.');
	}
}

main().catch(err => {
	console.error('❌ Error:', err.message || err);
	process.exit(1);
});
