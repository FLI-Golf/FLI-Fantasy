/**
 * Update PocketBase products with Stripe IDs
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(POCKETBASE_URL);

async function main() {
	try {
		console.log('🔐 Authenticating...');
		await pb.admins.authWithPassword(ADMIN_EMAIL!, ADMIN_PASSWORD!);
		console.log('✅ Authenticated\n');
		
		// Update T-Shirt
		console.log('📦 Updating FLI Golf Tour T-Shirt...');
		const tshirtResult = await pb.collection('products').getList(1, 10, {
			filter: 'slug = "fli-golf-tour-tshirt"'
		});
		
		if (tshirtResult.items.length > 0) {
			await pb.collection('products').update(tshirtResult.items[0].id, {
				stripe_product_id: 'prod_TUtzjLLFLuOZxr',
				stripe_price_id: 'price_1SXuBhCvrUeGzPZkjDvRR7Y7'
			});
			console.log('✅ T-Shirt updated with Stripe IDs\n');
		}
		
		// Update Hoodie
		console.log('📦 Updating FLI Golf Championship Hoodie...');
		const hoodieResult = await pb.collection('products').getList(1, 10, {
			filter: 'slug = "fli-golf-championship-hoodie"'
		});
		
		if (hoodieResult.items.length > 0) {
			await pb.collection('products').update(hoodieResult.items[0].id, {
				stripe_product_id: 'prod_TUty1H3UT4kjmD',
				stripe_price_id: 'price_1SXuAtCvrUeGzPZksybTGiBv'
			});
			console.log('✅ Hoodie updated with Stripe IDs\n');
		}
		
		console.log('🎉 All products updated successfully!');
		console.log('\n📝 Next steps:');
		console.log('   1. Products are now linked to Stripe');
		console.log('   2. Ready to create checkout sessions');
		console.log('   3. Test with: pnpm run stripe:test');
		
	} catch (error: any) {
		console.error('❌ Error:', error.message);
		process.exit(1);
	}
}

main();
