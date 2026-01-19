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

async function seedTickerItems() {
	console.log('🔐 Authenticating as admin...');
	await pb.admins.authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD);
	console.log('✅ Authenticated\n');

	// Clear existing items
	console.log('🗑️  Clearing existing ticker items...');
	const existing = await pb.collection('ticker_items').getFullList();
	for (const item of existing) {
		await pb.collection('ticker_items').delete(item.id);
	}
	console.log(`   Deleted ${existing.length} items\n`);

	// Create sample ticker items
	console.log('📝 Creating ticker items...\n');

	const items = [
		{
			type: 'announcement',
			title: 'Welcome to FLI Fantasy!',
			message: 'Join the excitement of fantasy disc golf',
			priority: 50,
			is_active: true,
			bg_color: 'from-green-800 to-green-900',
			text_color: 'white'
		},
		{
			type: 'promotion',
			title: 'Early Bird Tickets Available!',
			message: 'Save 20% on FLI Open tickets - Use code EARLYBIRD',
			link_text: 'Shop Now',
			icon: 'ticket',
			priority: 70,
			is_active: true,
			bg_color: 'from-purple-800 to-purple-900',
			text_color: 'white'
		},
		{
			type: 'countdown',
			title: 'FLI Open Championship',
			message: 'April 25, 2026 - Phoenix, AZ',
			link_text: 'View Schedule',
			icon: 'trophy',
			priority: 60,
			is_active: true,
			bg_color: 'from-blue-800 to-blue-900',
			text_color: 'white'
		},
		{
			type: 'fantasy',
			title: 'Fantasy Drafts Open!',
			message: 'Create your league and draft your team',
			link_text: 'Start Drafting',
			icon: 'users',
			priority: 65,
			is_active: true,
			bg_color: 'from-amber-700 to-amber-900',
			text_color: 'white'
		},
		{
			type: 'promotion',
			title: 'New Merch Drop!',
			message: 'Official FLI team jerseys now available',
			link_text: 'Shop Merch',
			icon: 'shopping-bag',
			priority: 55,
			is_active: false,  // Inactive example
			bg_color: 'from-pink-700 to-pink-900',
			text_color: 'white'
		}
	];

	for (const item of items) {
		const created = await pb.collection('ticker_items').create(item);
		console.log(`   ✅ [${item.type}] ${item.title} (priority: ${item.priority}, active: ${item.is_active})`);
	}

	console.log('\n🎉 Done! Created', items.length, 'ticker items');

	// Verify
	console.log('\n📋 Verification:');
	const all = await pb.collection('ticker_items').getFullList({ sort: '-priority' });
	console.log(`   Found ${all.length} items in database`);
	all.forEach((item: any) => {
		const status = item.is_active ? '🟢' : '⚪';
		console.log(`   ${status} [${item.priority}] ${item.type}: ${item.title}`);
	});
}

seedTickerItems().catch(console.error);
