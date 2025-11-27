/**
 * Create Sample Products in PocketBase
 * 
 * This script creates sample products for testing:
 * - Clothing items (t-shirts, hoodies)
 * - Event tickets
 * - Fantasy league products
 * 
 * Run with: pnpm exec tsx scripts/create-sample-products.ts
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(POCKETBASE_URL);

async function authenticateAdmin() {
	console.log('🔐 Authenticating as admin...');
	if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
		throw new Error('Admin credentials not found in environment variables');
	}
	
	await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
	console.log('✅ Authenticated successfully\n');
}

async function createCategories() {
	console.log('📁 Creating product categories...');
	
	const categories = [
		{
			name: 'Apparel',
			slug: 'apparel',
			description: 'Official FLI Golf clothing and merchandise',
			sort_order: 1,
			is_active: true
		},
		{
			name: 'Event Tickets',
			slug: 'event-tickets',
			description: 'Tickets to FLI Golf tournaments and events',
			sort_order: 2,
			is_active: true
		},
		{
			name: 'Fantasy Leagues',
			slug: 'fantasy-leagues',
			description: 'Premium fantasy league features and upgrades',
			sort_order: 3,
			is_active: true
		}
	];
	
	const createdCategories: any = {};
	
	for (const category of categories) {
		try {
			// Check if category already exists
			const existing = await pb.collection('product_categories').getFullList({
				filter: `slug = "${category.slug}"`
			});
			
			if (existing.length > 0) {
				console.log(`   ⏭️  Category "${category.name}" already exists`);
				createdCategories[category.slug] = existing[0];
			} else {
				const created = await pb.collection('product_categories').create(category);
				console.log(`   ✅ Created category: ${category.name}`);
				createdCategories[category.slug] = created;
			}
		} catch (error: any) {
			console.error(`   ❌ Error creating category "${category.name}": ${error.message}`);
		}
	}
	
	console.log('');
	return createdCategories;
}

async function createProducts(categories: any) {
	console.log('📦 Creating sample products...');
	
	const products = [
		// Apparel
		{
			name: 'FLI Golf Tour T-Shirt',
			slug: 'fli-golf-tour-tshirt',
			description: 'Official FLI Golf Tour t-shirt featuring the iconic tour logo. Made from premium cotton for maximum comfort. Perfect for showing your support for the world\'s premier disc golf tour.',
			short_description: 'Official tour t-shirt with logo',
			category: categories['apparel'].id,
			product_type: 'clothing',
			price: 2999, // $29.99
			compare_at_price: 3499, // $34.99 (on sale)
			is_active: true,
			is_featured: true,
			stock_quantity: 100,
			requires_shipping: true,
			metadata: {
				material: '100% Cotton',
				care: 'Machine wash cold'
			}
		},
		{
			name: 'FLI Golf Championship Hoodie',
			slug: 'fli-golf-championship-hoodie',
			description: 'Premium hoodie commemorating the FLI Golf Championship. Features embroidered logo, kangaroo pocket, and adjustable drawstring hood. Stay warm while representing the tour.',
			short_description: 'Premium championship hoodie',
			category: categories['apparel'].id,
			product_type: 'clothing',
			price: 5999, // $59.99
			is_active: true,
			is_featured: true,
			stock_quantity: 50,
			requires_shipping: true,
			metadata: {
				material: '80% Cotton, 20% Polyester',
				care: 'Machine wash cold, tumble dry low'
			}
		},
		{
			name: 'FLI Golf Performance Hat',
			slug: 'fli-golf-performance-hat',
			description: 'Moisture-wicking performance hat with FLI Golf logo. Adjustable strap for perfect fit. Ideal for tournament days or casual wear.',
			short_description: 'Performance hat with logo',
			category: categories['apparel'].id,
			product_type: 'clothing',
			price: 2499, // $24.99
			is_active: true,
			is_featured: false,
			stock_quantity: 75,
			requires_shipping: true,
			metadata: {
				material: 'Polyester blend',
				care: 'Hand wash recommended'
			}
		},
		
		// Event Tickets
		{
			name: 'FLI Golf Championship - General Admission',
			slug: 'championship-general-admission',
			description: 'General admission ticket to the FLI Golf Championship. Includes access to all tournament rounds, viewing areas, and fan zones. Experience the world\'s best disc golf athletes compete for the largest purse in history.',
			short_description: 'General admission tournament pass',
			category: categories['event-tickets'].id,
			product_type: 'ticket',
			price: 7500, // $75.00
			is_active: true,
			is_featured: true,
			stock_quantity: 500,
			requires_shipping: false,
			metadata: {
				event_date: '2024-06-15',
				venue: 'Championship Course',
				includes: 'All tournament rounds, fan zones'
			}
		},
		{
			name: 'FLI Golf Championship - VIP Pass',
			slug: 'championship-vip-pass',
			description: 'VIP access to the FLI Golf Championship. Includes premium seating, exclusive hospitality area, meet-and-greet with players, commemorative gift bag, and all general admission benefits.',
			short_description: 'VIP tournament experience',
			category: categories['event-tickets'].id,
			product_type: 'ticket',
			price: 25000, // $250.00
			is_active: true,
			is_featured: true,
			stock_quantity: 50,
			requires_shipping: false,
			metadata: {
				event_date: '2024-06-15',
				venue: 'Championship Course',
				includes: 'Premium seating, hospitality, meet-and-greet, gift bag'
			}
		},
		{
			name: 'Season Pass - All Events',
			slug: 'season-pass-all-events',
			description: 'Full season pass granting access to all FLI Golf Tour events. The ultimate fan experience - follow the tour all year long and witness every thrilling moment.',
			short_description: 'Access to all tour events',
			category: categories['event-tickets'].id,
			product_type: 'ticket',
			price: 49900, // $499.00
			is_active: true,
			is_featured: true,
			stock_quantity: 100,
			requires_shipping: false,
			metadata: {
				season: '2024',
				events: 'All FLI Golf Tour events',
				transferable: 'No'
			}
		},
		
		// Fantasy Leagues
		{
			name: 'Premium Fantasy League',
			slug: 'premium-fantasy-league',
			description: 'Upgrade to Premium Fantasy League and unlock advanced features: detailed player statistics, draft assistant, trade analyzer, custom scoring rules, and priority support.',
			short_description: 'Premium fantasy features',
			category: categories['fantasy-leagues'].id,
			product_type: 'fantasy_league',
			price: 1999, // $19.99
			is_active: true,
			is_featured: true,
			stock_quantity: null, // Unlimited digital product
			requires_shipping: false,
			metadata: {
				duration: 'Full season',
				features: 'Advanced stats, draft assistant, trade analyzer'
			}
		},
		{
			name: 'Fantasy League Pro',
			slug: 'fantasy-league-pro',
			description: 'The ultimate fantasy experience. Includes all Premium features plus: AI-powered recommendations, exclusive player insights, early draft access, and dedicated account manager.',
			short_description: 'Ultimate fantasy experience',
			category: categories['fantasy-leagues'].id,
			product_type: 'fantasy_league',
			price: 4999, // $49.99
			is_active: true,
			is_featured: true,
			stock_quantity: null, // Unlimited digital product
			requires_shipping: false,
			metadata: {
				duration: 'Full season',
				features: 'All Premium + AI recommendations, player insights, early access'
			}
		}
	];
	
	const createdProducts: any[] = [];
	
	for (const product of products) {
		try {
			// Check if product already exists
			const existing = await pb.collection('products').getFullList({
				filter: `slug = "${product.slug}"`
			});
			
			if (existing.length > 0) {
				console.log(`   ⏭️  Product "${product.name}" already exists`);
				createdProducts.push(existing[0]);
			} else {
				const created = await pb.collection('products').create(product);
				console.log(`   ✅ Created product: ${product.name} ($${(product.price / 100).toFixed(2)})`);
				createdProducts.push(created);
			}
		} catch (error: any) {
			console.error(`   ❌ Error creating product "${product.name}": ${error.message}`);
		}
	}
	
	console.log('');
	return createdProducts;
}

async function createVariants(products: any[]) {
	console.log('🎨 Creating product variants...');
	
	// Find the t-shirt and hoodie products
	const tshirt = products.find(p => p.slug === 'fli-golf-tour-tshirt');
	const hoodie = products.find(p => p.slug === 'fli-golf-championship-hoodie');
	
	if (!tshirt && !hoodie) {
		console.log('   ℹ️  No clothing products found to create variants for\n');
		return;
	}
	
	const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
	const colors = [
		{ name: 'Black', hex: '#000000' },
		{ name: 'Navy', hex: '#001f3f' },
		{ name: 'White', hex: '#FFFFFF' }
	];
	
	let variantCount = 0;
	
	// Create variants for t-shirt
	if (tshirt) {
		for (const size of sizes) {
			for (const color of colors) {
				try {
					// Check if variant already exists
					const existing = await pb.collection('product_variants').getFullList({
						filter: `product = "${tshirt.id}" && size = "${size}" && color = "${color.name}"`
					});
					
					if (existing.length > 0) {
						continue; // Skip if exists
					}
					
					const variant = {
						product: tshirt.id,
						name: `${size} - ${color.name}`,
						sku: `FLIGOLF-TSHIRT-${size}-${color.name.toUpperCase()}`,
						size: size,
						color: color.name,
						price_adjustment: size === 'XXL' ? 200 : 0, // $2 extra for XXL
						stock_quantity: 20,
						is_active: true
					};
					
					await pb.collection('product_variants').create(variant);
					variantCount++;
				} catch (error: any) {
					console.error(`   ❌ Error creating variant: ${error.message}`);
				}
			}
		}
	}
	
	// Create variants for hoodie
	if (hoodie) {
		for (const size of sizes) {
			for (const color of colors.slice(0, 2)) { // Only Black and Navy for hoodies
				try {
					// Check if variant already exists
					const existing = await pb.collection('product_variants').getFullList({
						filter: `product = "${hoodie.id}" && size = "${size}" && color = "${color.name}"`
					});
					
					if (existing.length > 0) {
						continue; // Skip if exists
					}
					
					const variant = {
						product: hoodie.id,
						name: `${size} - ${color.name}`,
						sku: `FLIGOLF-HOODIE-${size}-${color.name.toUpperCase()}`,
						size: size,
						color: color.name,
						price_adjustment: size === 'XXL' ? 500 : 0, // $5 extra for XXL
						stock_quantity: 10,
						is_active: true
					};
					
					await pb.collection('product_variants').create(variant);
					variantCount++;
				} catch (error: any) {
					console.error(`   ❌ Error creating variant: ${error.message}`);
				}
			}
		}
	}
	
	console.log(`   ✅ Created ${variantCount} product variants\n`);
}

async function main() {
	try {
		console.log('🚀 Creating Sample Products for FLI Golf Shop...\n');
		console.log(`📍 Target: ${POCKETBASE_URL}\n`);
		
		await authenticateAdmin();
		
		// Create categories
		const categories = await createCategories();
		
		// Create products
		const products = await createProducts(categories);
		
		// Create variants for clothing items
		await createVariants(products);
		
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log('✅ Sample products created successfully!');
		console.log('\n📊 Summary:');
		console.log('   📁 Categories: 3 (Apparel, Event Tickets, Fantasy Leagues)');
		console.log('   📦 Products: 8 total');
		console.log('      - 3 Apparel items');
		console.log('      - 3 Event tickets');
		console.log('      - 2 Fantasy league products');
		console.log('   🎨 Variants: Multiple sizes and colors for clothing');
		console.log('\n📝 Next steps:');
		console.log('   1. View products in PocketBase:');
		console.log(`      ${POCKETBASE_URL}/_/`);
		console.log('   2. Sync products to Stripe:');
		console.log('      pnpm run stripe:sync');
		console.log('   3. View in Stripe Dashboard:');
		console.log('      https://dashboard.stripe.com/test/products');
		
	} catch (error: any) {
		console.error('\n❌ Failed to create sample products:', error.message);
		process.exit(1);
	}
}

main();
