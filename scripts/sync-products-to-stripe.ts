/**
 * Sync Products from PocketBase to Stripe
 * 
 * This script reads products from your PocketBase database and creates
 * corresponding products and prices in Stripe, then updates PocketBase
 * with the Stripe IDs.
 * 
 * Run with: pnpm exec tsx scripts/sync-products-to-stripe.ts
 */

import PocketBase from 'pocketbase';
import Stripe from 'stripe';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
	console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
	process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);
const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2024-11-20.acacia',
	typescript: true
});

async function authenticateAdmin() {
	console.log('🔐 Authenticating as admin...');
	if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
		throw new Error('Admin credentials not found in environment variables');
	}
	
	await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
	console.log('✅ Authenticated successfully\n');
}

async function syncProductToStripe(product: any) {
	console.log(`📦 Syncing product: ${product.name}`);
	
	try {
		// Check if product already has Stripe IDs
		if (product.stripe_product_id && product.stripe_price_id) {
			console.log(`   ⏭️  Already synced (Product: ${product.stripe_product_id}, Price: ${product.stripe_price_id})`);
			return;
		}
		
		// Get product images (convert PocketBase file URLs to full URLs)
		const images: string[] = [];
		if (product.images && product.images.length > 0) {
			// PocketBase file URL format: /api/files/COLLECTION_ID/RECORD_ID/FILENAME
			product.images.forEach((filename: string) => {
				const imageUrl = `${POCKETBASE_URL}/api/files/${product.collectionId}/${product.id}/${filename}`;
				images.push(imageUrl);
			});
		}
		
		// Create Stripe Product
		let stripeProduct: Stripe.Product;
		
		if (product.stripe_product_id) {
			// Product exists, retrieve it
			stripeProduct = await stripe.products.retrieve(product.stripe_product_id);
			console.log(`   ✅ Found existing Stripe product: ${stripeProduct.id}`);
		} else {
			// Create new product
			stripeProduct = await stripe.products.create({
				name: product.name,
				description: product.description || product.short_description || undefined,
				images: images.length > 0 ? images.slice(0, 8) : undefined, // Stripe allows max 8 images
				metadata: {
					pocketbase_id: product.id,
					product_type: product.product_type,
					slug: product.slug
				},
				active: product.is_active
			});
			console.log(`   ✅ Created Stripe product: ${stripeProduct.id}`);
		}
		
		// Create Stripe Price
		let stripePrice: Stripe.Price;
		
		if (product.stripe_price_id) {
			// Price exists, retrieve it
			stripePrice = await stripe.prices.retrieve(product.stripe_price_id);
			console.log(`   ✅ Found existing Stripe price: ${stripePrice.id}`);
		} else {
			// Create new price
			stripePrice = await stripe.prices.create({
				product: stripeProduct.id,
				unit_amount: product.price, // Price is already in cents
				currency: 'usd',
				metadata: {
					pocketbase_id: product.id
				}
			});
			console.log(`   ✅ Created Stripe price: ${stripePrice.id}`);
		}
		
		// Update PocketBase product with Stripe IDs
		await pb.collection('products').update(product.id, {
			stripe_product_id: stripeProduct.id,
			stripe_price_id: stripePrice.id
		});
		
		console.log(`   ✅ Updated PocketBase product with Stripe IDs\n`);
		
		return {
			product: stripeProduct,
			price: stripePrice
		};
		
	} catch (error: any) {
		console.error(`   ❌ Error syncing product: ${error.message}\n`);
		throw error;
	}
}

async function syncProductVariantsToStripe(productId: string, stripeProductId: string) {
	console.log(`   🔄 Syncing variants for product ${productId}...`);
	
	try {
		// Get all variants for this product
		const variants = await pb.collection('product_variants').getFullList({
			filter: `product = "${productId}"`
		});
		
		if (variants.length === 0) {
			console.log(`   ℹ️  No variants found\n`);
			return;
		}
		
		console.log(`   📦 Found ${variants.length} variant(s)`);
		
		for (const variant of variants) {
			try {
				// Check if variant already has Stripe price ID
				if (variant.stripe_price_id) {
					console.log(`      ⏭️  Variant "${variant.name}" already synced (${variant.stripe_price_id})`);
					continue;
				}
				
				// Get base product to calculate final price
				const baseProduct = await pb.collection('products').getOne(productId);
				const finalPrice = baseProduct.price + (variant.price_adjustment || 0);
				
				// Create Stripe Price for variant
				const stripePrice = await stripe.prices.create({
					product: stripeProductId,
					unit_amount: finalPrice,
					currency: 'usd',
					metadata: {
						pocketbase_variant_id: variant.id,
						variant_name: variant.name,
						size: variant.size || '',
						color: variant.color || ''
					}
				});
				
				// Update PocketBase variant with Stripe price ID
				await pb.collection('product_variants').update(variant.id, {
					stripe_price_id: stripePrice.id
				});
				
				console.log(`      ✅ Synced variant "${variant.name}" (${stripePrice.id})`);
				
			} catch (error: any) {
				console.error(`      ❌ Error syncing variant "${variant.name}": ${error.message}`);
			}
		}
		
		console.log(`   ✅ Finished syncing variants\n`);
		
	} catch (error: any) {
		console.error(`   ❌ Error syncing variants: ${error.message}\n`);
	}
}

async function main() {
	try {
		console.log('🚀 Starting Product Sync to Stripe...\n');
		console.log(`📍 PocketBase: ${POCKETBASE_URL}`);
		console.log(`📍 Stripe: ${STRIPE_SECRET_KEY.includes('test') ? 'Test Mode' : 'Live Mode'}\n`);
		
		await authenticateAdmin();
		
		// Get all products from PocketBase
		console.log('📋 Fetching products from PocketBase...');
		console.log('Auth token present:', pb.authStore.token ? 'Yes' : 'No');
		
		let products: any[] = [];
		try {
			const result = await pb.collection('products').getList(1, 50, {
				sort: 'created'
			});
			products = result.items;
		} catch (error: any) {
			console.error('Error fetching products:', error.message);
			console.error('Error data:', error.data);
			throw error;
		}
		
		console.log(`✅ Found ${products.length} product(s)\n`);
		
		if (products.length === 0) {
			console.log('ℹ️  No products to sync. Create some products in PocketBase first!');
			console.log('\n💡 Tip: Access PocketBase admin at:');
			console.log(`   ${POCKETBASE_URL}/_/`);
			return;
		}
		
		let successCount = 0;
		let errorCount = 0;
		
		// Sync each product
		for (const product of products) {
			try {
				await syncProductToStripe(product);
				
				// Sync variants if product has any
				if (product.stripe_product_id) {
					await syncProductVariantsToStripe(product.id, product.stripe_product_id);
				}
				
				successCount++;
			} catch (error) {
				errorCount++;
			}
		}
		
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log('✅ Product sync completed!');
		console.log(`\n📊 Summary:`);
		console.log(`   ✅ Successful: ${successCount}`);
		console.log(`   ❌ Failed: ${errorCount}`);
		console.log(`   📦 Total: ${products.length}`);
		console.log('\n🎉 Your products are now available in Stripe!');
		console.log('\n📝 Next steps:');
		console.log('   1. View products in Stripe Dashboard: https://dashboard.stripe.com/test/products');
		console.log('   2. Create a checkout flow to sell products');
		console.log('   3. Test with Stripe test cards');
		
	} catch (error: any) {
		console.error('\n❌ Sync failed:', error.message);
		if (error.data) {
			console.error('Error details:', JSON.stringify(error.data, null, 2));
		}
		if (error.stack) {
			console.error('Stack trace:', error.stack);
		}
		process.exit(1);
	}
}

main();
