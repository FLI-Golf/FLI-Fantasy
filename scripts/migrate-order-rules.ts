/**
 * Migration: Update order-related collection rules
 * 
 * Fixes security issues where authenticated users could see all orders.
 * After this migration:
 * - Users can only see their own orders
 * - Users can only see order items for their own orders
 * - Users can only see payments for their own orders
 * - Order creation happens server-side (API), so createRule stays admin-only for order_items/payments
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

async function migrateOrderRules() {
	console.log('🔐 Authenticating as admin...');
	await pb.admins.authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD);
	console.log('✅ Authenticated\n');

	// Update orders collection
	console.log('📝 Updating orders collection rules...');
	try {
		await pb.collections.update('orders', {
			// Users can only list/view their own orders
			listRule: '@request.auth.id != "" && user = @request.auth.id',
			viewRule: '@request.auth.id != "" && user = @request.auth.id',
			// Authenticated users can create orders
			createRule: '@request.auth.id != ""',
			// Only admins can update/delete
			updateRule: null,
			deleteRule: null
		});
		console.log('  ✅ orders: Users can only see their own orders');
	} catch (err: any) {
		console.log(`  ❌ orders: ${err.message}`);
	}

	// Update order_items collection
	console.log('📝 Updating order_items collection rules...');
	try {
		await pb.collections.update('order_items', {
			// Users can only list/view items from their own orders
			listRule: '@request.auth.id != "" && order.user = @request.auth.id',
			viewRule: '@request.auth.id != "" && order.user = @request.auth.id',
			// Server creates order items (via API endpoint), so keep admin-only
			// The API uses admin auth to create these
			createRule: null,
			updateRule: null,
			deleteRule: null
		});
		console.log('  ✅ order_items: Users can only see items from their own orders');
	} catch (err: any) {
		console.log(`  ❌ order_items: ${err.message}`);
	}

	// Update payments collection
	console.log('📝 Updating payments collection rules...');
	try {
		await pb.collections.update('payments', {
			// Users can only list/view payments for their own orders
			listRule: '@request.auth.id != "" && order.user = @request.auth.id',
			viewRule: '@request.auth.id != "" && order.user = @request.auth.id',
			// Server creates payments (via webhook), so keep admin-only
			createRule: null,
			updateRule: null,
			deleteRule: null
		});
		console.log('  ✅ payments: Users can only see payments for their own orders');
	} catch (err: any) {
		console.log(`  ❌ payments: ${err.message}`);
	}

	console.log('\n🎉 Migration complete!');
	
	// Verify changes
	console.log('\n📋 Verifying changes...');
	for (const name of ['orders', 'order_items', 'payments']) {
		const col = await pb.collections.getOne(name);
		console.log(`\n${name}:`);
		console.log(`  listRule:   ${col.listRule || '(null)'}`);
		console.log(`  viewRule:   ${col.viewRule || '(null)'}`);
		console.log(`  createRule: ${col.createRule || '(null)'}`);
	}
}

migrateOrderRules().catch(console.error);
