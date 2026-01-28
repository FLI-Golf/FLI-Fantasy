/**
 * Create sponsors collection in PocketBase and seed sample data
 */

import PocketBase from 'pocketbase';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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

const sampleSponsors = [
	{
		name: 'Innova Discs',
		logo_url: 'https://images.squarespace-cdn.com/content/v1/5e7f0a8e5f5e0a7e8e8e8e8e/innova-logo.png',
		website_url: 'https://www.innovadiscs.com',
		tier: 'platinum',
		is_active: true,
		display_order: 1
	},
	{
		name: 'Discraft',
		logo_url: 'https://images.squarespace-cdn.com/content/v1/discraft-logo.png',
		website_url: 'https://www.discraft.com',
		tier: 'platinum',
		is_active: true,
		display_order: 2
	},
	{
		name: 'Dynamic Discs',
		logo_url: 'https://images.squarespace-cdn.com/content/v1/dynamic-discs-logo.png',
		website_url: 'https://www.dynamicdiscs.com',
		tier: 'gold',
		is_active: true,
		display_order: 3
	},
	{
		name: 'MVP Disc Sports',
		logo_url: 'https://images.squarespace-cdn.com/content/v1/mvp-logo.png',
		website_url: 'https://mvpdiscsports.com',
		tier: 'gold',
		is_active: true,
		display_order: 4
	},
	{
		name: 'Latitude 64',
		logo_url: 'https://images.squarespace-cdn.com/content/v1/latitude64-logo.png',
		website_url: 'https://www.latitude64.se',
		tier: 'silver',
		is_active: true,
		display_order: 5
	},
	{
		name: 'Prodigy Disc',
		logo_url: 'https://images.squarespace-cdn.com/content/v1/prodigy-logo.png',
		website_url: 'https://www.prodigydisc.com',
		tier: 'silver',
		is_active: true,
		display_order: 6
	},
	{
		name: 'Kastaplast',
		logo_url: 'https://images.squarespace-cdn.com/content/v1/kastaplast-logo.png',
		website_url: 'https://www.kastaplast.se',
		tier: 'bronze',
		is_active: true,
		display_order: 7
	},
	{
		name: 'Discmania',
		logo_url: 'https://images.squarespace-cdn.com/content/v1/discmania-logo.png',
		website_url: 'https://www.discmania.net',
		tier: 'bronze',
		is_active: true,
		display_order: 8
	}
];

async function main() {
	console.log('Authenticating...');
	await pb.admins.authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD);
	console.log('Authenticated\n');

	// Check if collection already exists
	try {
		await pb.collections.getOne('sponsors');
		console.log('sponsors collection already exists, skipping creation');
	} catch (err: any) {
		if (err.status !== 404) {
			throw err;
		}

		console.log('Creating sponsors collection...');

		await pb.collections.create({
			name: 'sponsors',
			type: 'base',
			listRule: '',
			viewRule: '',
			createRule: '@request.auth.id != ""',
			updateRule: '@request.auth.id != ""',
			deleteRule: '@request.auth.id != ""',
			fields: [
				{
					name: 'name',
					type: 'text',
					required: true,
					max: 200
				},
				{
					name: 'logo_url',
					type: 'url',
					required: false
				},
				{
					name: 'logo',
					type: 'file',
					required: false,
					maxSelect: 1,
					maxSize: 5242880,
					mimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
				},
				{
					name: 'website_url',
					type: 'url',
					required: false
				},
				{
					name: 'tier',
					type: 'select',
					required: true,
					values: ['platinum', 'gold', 'silver', 'bronze'],
					maxSelect: 1
				},
				{
					name: 'is_active',
					type: 'bool',
					required: false
				},
				{
					name: 'display_order',
					type: 'number',
					required: false,
					min: 0,
					onlyInt: true
				},
				{
					name: 'description',
					type: 'text',
					required: false,
					max: 500
				}
			]
		});

		console.log('sponsors collection created\n');
	}

	// Seed sample sponsors
	console.log('Seeding sample sponsors...');
	
	for (const sponsor of sampleSponsors) {
		try {
			// Check if sponsor already exists
			const existing = await pb.collection('sponsors').getFirstListItem(`name="${sponsor.name}"`);
			console.log(`  ${sponsor.name} already exists, skipping`);
		} catch (err: any) {
			if (err.status === 404) {
				await pb.collection('sponsors').create(sponsor);
				console.log(`  Created: ${sponsor.name} (${sponsor.tier})`);
			} else {
				throw err;
			}
		}
	}

	console.log('\nDone!');
}

main().catch(err => {
	console.error('Error:', err.message || err);
	process.exit(1);
});
