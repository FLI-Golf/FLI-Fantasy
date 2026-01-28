/**
 * Add Team Color Fields Migration
 * 
 * Usage: pnpm tsx scripts/add-team-colors.ts
 * 
 * Adds primary_color, secondary_color, tertiary_color, quaternary_color fields to teams collection
 * Then populates them with the team colors.
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

// Team colors mapping
const teamColors: Record<string, { primary: string; secondary: string; tertiary?: string; quaternary?: string }> = {
	'Huk-a-Mania': { 
		primary: '#4B0082',      // Deep purple
		secondary: '#FF69B4'     // Hot pink
	},
	'Fairway Bombers': { 
		primary: '#90EE90',      // Light green
		secondary: '#000000'     // Black
	},
	'Chain Seekers': { 
		primary: '#4169E1',      // Royal purple
		secondary: '#000000'     // Black
	},
	'Flight Squad': { 
		primary: '#87CEEB',      // Light blue
		secondary: '#000000'     // Black
	},
	'Glide Masters': { 
		primary: '#8B0000',      // Dark red
		secondary: '#FFD700'     // Yellow
	},
	'Disc Dynasty': { 
		primary: '#8B0000',      // Blood red
		secondary: '#000000'     // Black
	},
	'Ace Makers': { 
		primary: '#B22222',      // Deep red
		secondary: '#000000'     // Black
	},
	'Midas Touch': { 
		primary: '#00008B',      // Deep blue
		secondary: '#FFD700'     // Yellow
	},
	'Hyzer Heros': { 
		primary: '#4169E1',      // Royal purple
		secondary: '#FF8C00'     // Orange
	},
	'Chain Breakers': { 
		primary: '#000000',      // Black
		secondary: '#000000'     // Black (only black)
	},
	'Birdie Storm': { 
		primary: '#87CEEB',      // Light blue
		secondary: '#000000'     // Black
	},
	'Disc Jesters': { 
		primary: '#90EE90',      // Light green
		secondary: '#006400',    // Dark green
		tertiary: '#FFD700',     // Yellow
		quaternary: '#000000'    // Black
	}
};

async function main() {
	console.log('🎨 Add Team Colors Migration');
	console.log('============================\n');

	// Authenticate
	console.log('🔐 Authenticating...');
	await pb.admins.authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD);
	console.log('✅ Authenticated\n');

	// Get current teams collection schema
	console.log('📋 Checking teams collection schema...');
	const teamsCollection = await pb.collections.getOne('teams');
	const existingFields = teamsCollection.fields?.map((f: any) => f.name) || [];
	
	const colorFields = ['primary_color', 'secondary_color', 'tertiary_color', 'quaternary_color'];
	const fieldsToAdd = colorFields.filter(f => !existingFields.includes(f));
	
	if (fieldsToAdd.length > 0) {
		console.log(`   Adding fields: ${fieldsToAdd.join(', ')}`);
		
		const newFields = fieldsToAdd.map(fieldName => ({
			name: fieldName,
			type: 'text',
			required: false,
			max: 20
		}));
		
		await pb.collections.update('teams', {
			fields: [...(teamsCollection.fields || []), ...newFields]
		});
		console.log('✅ Fields added\n');
	} else {
		console.log('   Color fields already exist\n');
	}

	// Update team colors
	console.log('🎨 Updating team colors...\n');
	
	const teams = await pb.collection('teams').getFullList();
	
	for (const team of teams) {
		const colors = teamColors[team.name];
		if (colors) {
			await pb.collection('teams').update(team.id, {
				primary_color: colors.primary,
				secondary_color: colors.secondary,
				tertiary_color: colors.tertiary || null,
				quaternary_color: colors.quaternary || null
			});
			console.log(`   ✅ ${team.name}: ${colors.primary} / ${colors.secondary}${colors.tertiary ? ` / ${colors.tertiary}` : ''}${colors.quaternary ? ` / ${colors.quaternary}` : ''}`);
		} else {
			console.log(`   ⏭️  ${team.name}: No colors defined, skipping`);
		}
	}

	console.log('\n✅ Done!');
}

main().catch(err => {
	console.error('❌ Error:', err.message || err);
	process.exit(1);
});
