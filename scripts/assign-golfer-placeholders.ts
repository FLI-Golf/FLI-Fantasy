/**
 * Assign Placeholder Images to Golfers
 * 
 * Usage: pnpm tsx scripts/assign-golfer-placeholders.ts
 * 
 * This script assigns placeholder SVG images to golfers based on gender:
 * - Male golfers get: male-disc-golfer.svg
 * - Female golfers get: female-disc-golfer.svg
 * 
 * Only updates golfers that don't already have an image.
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

// Paths to placeholder SVGs
const MALE_PLACEHOLDER = resolve(process.cwd(), 'static/place_holder_svg/male-disc-golfer.svg');
const FEMALE_PLACEHOLDER = resolve(process.cwd(), 'static/place_holder_svg/female-disc-golfer.svg');

async function main() {
	console.log('🖼️  Assign Placeholder Images to Golfers');
	console.log('========================================\n');

	// Authenticate
	console.log('🔐 Authenticating...');
	await pb.admins.authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD);
	console.log('✅ Authenticated\n');

	// Read placeholder files
	console.log('📁 Loading placeholder images...');
	const maleSvg = readFileSync(MALE_PLACEHOLDER);
	const femaleSvg = readFileSync(FEMALE_PLACEHOLDER);
	console.log('   Male placeholder:', MALE_PLACEHOLDER);
	console.log('   Female placeholder:', FEMALE_PLACEHOLDER);
	console.log('');

	// Get all golfers
	console.log('🏌️ Fetching golfers...');
	const golfers = await pb.collection('golfers').getFullList();
	console.log(`   Found ${golfers.length} golfers\n`);

	let updated = 0;
	let skipped = 0;
	let errors = 0;

	console.log('📤 Uploading placeholder images...\n');

	for (const golfer of golfers) {
		// Skip if already has an image
		if (golfer.image) {
			console.log(`   ⏭️  ${golfer.name} - already has image, skipping`);
			skipped++;
			continue;
		}

		// Determine which placeholder to use
		const isFemale = golfer.gender === 'female';
		const svgData = isFemale ? femaleSvg : maleSvg;
		const filename = isFemale ? 'female-placeholder.svg' : 'male-placeholder.svg';

		try {
			// Create a File/Blob for upload
			const formData = new FormData();
			const blob = new Blob([svgData], { type: 'image/svg+xml' });
			formData.append('image', blob, filename);

			await pb.collection('golfers').update(golfer.id, formData);
			console.log(`   ✅ ${golfer.name} (${golfer.gender || 'unknown'}) - uploaded ${filename}`);
			updated++;
		} catch (err: any) {
			console.log(`   ❌ ${golfer.name} - error: ${err.message}`);
			errors++;
		}
	}

	console.log('\n========================================');
	console.log('📊 Summary:');
	console.log(`   Updated: ${updated}`);
	console.log(`   Skipped: ${skipped}`);
	console.log(`   Errors: ${errors}`);
	console.log('\n✅ Done!');
}

main().catch(err => {
	console.error('❌ Error:', err.message || err);
	process.exit(1);
});
