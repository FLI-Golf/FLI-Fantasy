/**
 * Setup 18 Holes for Tournament
 * 
 * Usage: pnpm tsx scripts/setup-18-holes.ts
 * 
 * Creates 18 holes:
 * - Holes 1-9: First round (before halftime)
 * - Holes 10-18: Second round (after halftime, same physical holes with repositioned baskets)
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

// Default par 3 for all holes (can be adjusted later)
const holes = [
	// First round (holes 1-9)
	{ number: 1, title: 'Hole 1', par: 3, distance: 300, active: true },
	{ number: 2, title: 'Hole 2', par: 3, distance: 320, active: true },
	{ number: 3, title: 'Hole 3', par: 3, distance: 280, active: true },
	{ number: 4, title: 'Hole 4', par: 3, distance: 350, active: true },
	{ number: 5, title: 'Hole 5', par: 3, distance: 310, active: true },
	{ number: 6, title: 'Hole 6', par: 3, distance: 290, active: true },
	{ number: 7, title: 'Hole 7', par: 3, distance: 340, active: true },
	{ number: 8, title: 'Hole 8', par: 3, distance: 270, active: true },
	{ number: 9, title: 'Hole 9', par: 3, distance: 330, active: true },
	// Second round (holes 10-18, same physical holes with repositioned baskets)
	{ number: 10, title: 'Hole 10', par: 3, distance: 310, active: true },
	{ number: 11, title: 'Hole 11', par: 3, distance: 330, active: true },
	{ number: 12, title: 'Hole 12', par: 3, distance: 290, active: true },
	{ number: 13, title: 'Hole 13', par: 3, distance: 360, active: true },
	{ number: 14, title: 'Hole 14', par: 3, distance: 320, active: true },
	{ number: 15, title: 'Hole 15', par: 3, distance: 300, active: true },
	{ number: 16, title: 'Hole 16', par: 3, distance: 350, active: true },
	{ number: 17, title: 'Hole 17', par: 3, distance: 280, active: true },
	{ number: 18, title: 'Hole 18', par: 3, distance: 340, active: true },
];

async function main() {
	console.log('Setting up 18 holes for tournament');
	console.log('===================================\n');

	// Authenticate
	console.log('Authenticating...');
	await pb.admins.authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD);
	console.log('Authenticated\n');

	// Delete existing holes
	console.log('Clearing existing holes...');
	const existingHoles = await pb.collection('holes').getFullList();
	for (const hole of existingHoles) {
		await pb.collection('holes').delete(hole.id);
	}
	console.log(`Deleted ${existingHoles.length} existing holes\n`);

	// Create 18 holes
	console.log('Creating 18 holes...\n');
	
	console.log('--- First Round (Holes 1-9) ---');
	for (const hole of holes.slice(0, 9)) {
		await pb.collection('holes').create(hole);
		console.log(`  Created Hole ${hole.number} (Par ${hole.par}, ${hole.distance}ft)`);
	}
	
	console.log('\n--- HALFTIME ---\n');
	
	console.log('--- Second Round (Holes 10-18) ---');
	for (const hole of holes.slice(9)) {
		await pb.collection('holes').create(hole);
		console.log(`  Created Hole ${hole.number} (Par ${hole.par}, ${hole.distance}ft)`);
	}

	console.log('\nDone! 18 holes created.');
	console.log('\nNote: Par and distance values are defaults. Update in PocketBase admin as needed.');
}

main().catch(err => {
	console.error('Error:', err.message || err);
	process.exit(1);
});
