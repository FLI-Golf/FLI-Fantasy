/**
 * Update Golfer Name Script
 * 
 * Usage: pnpm tsx scripts/update-golfer-name.ts "Old Name" "New Name"
 * 
 * Example: pnpm tsx scripts/update-golfer-name.ts "Kristin Tattar" "Kristin Latt"
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
	const oldName = process.argv[2];
	const newName = process.argv[3];

	if (!oldName || !newName) {
		console.log('Usage: pnpm tsx scripts/update-golfer-name.ts "Old Name" "New Name"');
		console.log('Example: pnpm tsx scripts/update-golfer-name.ts "Kristin Tattar" "Kristin Latt"');
		process.exit(1);
	}

	console.log(`Updating golfer name: "${oldName}" → "${newName}"\n`);

	// Authenticate
	console.log('Authenticating...');
	await pb.admins.authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD);
	console.log('Authenticated\n');

	// Find the golfer
	try {
		const golfer = await pb.collection('golfers').getFirstListItem(`name="${oldName}"`);
		console.log(`Found golfer: ${golfer.name} (ID: ${golfer.id})`);
		
		// Update the name
		await pb.collection('golfers').update(golfer.id, {
			name: newName
		});
		
		console.log(`Updated to: ${newName}`);
		console.log('\nDone!');
	} catch (err: any) {
		if (err.status === 404) {
			console.error(`Golfer "${oldName}" not found`);
		} else {
			console.error('Error:', err.message);
		}
		process.exit(1);
	}
}

main().catch(err => {
	console.error('Error:', err.message || err);
	process.exit(1);
});
