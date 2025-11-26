/**
 * PocketBase E-Commerce Collections Migration Script V2
 * 
 * Uses the correct 'fields' format for PocketBase
 * Creates collections for FLI Golf Shop with Stripe integration
 * 
 * Run with: pnpm exec tsx scripts/migrate-ecommerce-v2.ts
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(POCKETBASE_URL);

let collectionIdMap: Map<string, string> = new Map();

async function authenticateAdmin() {
	console.log('🔐 Authenticating as admin...');
	if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
		throw new Error('Admin credentials not found in environment variables');
	}
	
	await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
	console.log('✅ Authenticated successfully\n');
}

async function buildCollectionIdMap() {
	console.log('📋 Building collection ID map...');
	const collections = await pb.collections.getFullList();
	collections.forEach((col: any) => {
		collectionIdMap.set(col.name, col.id);
	});
	console.log(`✅ Mapped ${collectionIdMap.size} collections\n`);
}

async function createCollection(collectionData: any) {
	const { name } = collectionData;
	console.log(`📦 Creating ${name} collection...`);
	
	try {
		const created = await pb.collections.create(collectionData);
		console.log(`✅ ${name} created successfully\n`);
		collectionIdMap.set(name, created.id);
		return created;
	} catch (error: any) {
		if (error.status === 400 && error.message.includes('already exists')) {
			console.log(`⚠️  ${name} already exists, skipping...\n`);
			return null;
		}
		console.error(`❌ Failed to create ${name}:`, error.message);
		if (error.data) {
			console.error('   Error details:', JSON.stringify(error.data, null, 2));
		}
		throw error;
	}
}

async function main() {
	try {
		console.log('🚀 Starting E-Commerce migration V2...\n');
		console.log(`📍 Target: ${POCKETBASE_URL}\n`);
		
		await authenticateAdmin();
		await buildCollectionIdMap();
		
		const usersCollectionId = collectionIdMap.get('users') || collectionIdMap.get('_superusers');
		
		// 1. Product Categories
		await createCollection({
			name: 'product_categories',
			type: 'base',
			fields: [
				{
					name: 'name',
					type: 'text',
					required: true,
					min: 2,
					max: 100
				},
				{
					name: 'slug',
					type: 'text',
					required: true,
					unique: true,
					pattern: '^[a-z0-9-]+$',
					min: 1,
					max: 100
				},
				{
					name: 'description',
					type: 'text',
					required: false,
					max: 500
				},
				{
					name: 'image',
					type: 'file',
					required: false,
					maxSelect: 1,
					maxSize: 2097152
				},
				{
					name: 'sort_order',
					type: 'number',
					required: true,
					min: 0
				},
				{
					name: 'is_active',
					type: 'bool',
					required: true
				}
			],
			indexes: [
				'CREATE UNIQUE INDEX IF NOT EXISTS idx_category_slug ON product_categories (slug)'
			],
			listRule: 'is_active = true',
			viewRule: 'is_active = true',
			createRule: null,
			updateRule: null,
			deleteRule: null
		});
		
		await buildCollectionIdMap();
		const categoriesId = collectionIdMap.get('product_categories');
		
		// 2. Products
		await createCollection({
			name: 'products',
			type: 'base',
			fields: [
				{
					name: 'name',
					type: 'text',
					required: true,
					min: 3,
					max: 200
				},
				{
					name: 'slug',
					type: 'text',
					required: true,
					unique: true,
					pattern: '^[a-z0-9-]+$',
					min: 1,
					max: 200
				},
				{
					name: 'description',
					type: 'text',
					required: false,
					max: 2000
				},
				{
					name: 'short_description',
					type: 'text',
					required: false,
					max: 200
				},
				{
					name: 'category',
					type: 'relation',
					required: true,
					collectionId: categoriesId,
					cascadeDelete: false,
					maxSelect: 1,
					minSelect: 1
				},
				{
					name: 'product_type',
					type: 'select',
					required: true,
					maxSelect: 1,
					values: ['clothing', 'ticket', 'fantasy_league']
				},
				{
					name: 'price',
					type: 'number',
					required: true,
					min: 0
				},
				{
					name: 'compare_at_price',
					type: 'number',
					required: false,
					min: 0
				},
				{
					name: 'images',
					type: 'file',
					required: false,
					maxSelect: 10,
					maxSize: 5242880
				},
				{
					name: 'is_active',
					type: 'bool',
					required: true
				},
				{
					name: 'is_featured',
					type: 'bool',
					required: true
				},
				{
					name: 'stock_quantity',
					type: 'number',
					required: false,
					min: 0
				},
				{
					name: 'requires_shipping',
					type: 'bool',
					required: true
				},
				{
					name: 'stripe_product_id',
					type: 'text',
					required: false,
					max: 200
				},
				{
					name: 'stripe_price_id',
					type: 'text',
					required: false,
					max: 200
				},
				{
					name: 'metadata',
					type: 'json',
					required: false
				}
			],
			indexes: [
				'CREATE UNIQUE INDEX IF NOT EXISTS idx_product_slug ON products (slug)',
				'CREATE INDEX IF NOT EXISTS idx_product_category ON products (category)',
				'CREATE INDEX IF NOT EXISTS idx_product_type ON products (product_type)',
				'CREATE INDEX IF NOT EXISTS idx_product_active ON products (is_active)'
			],
			listRule: 'is_active = true',
			viewRule: 'is_active = true',
			createRule: null,
			updateRule: null,
			deleteRule: null
		});
		
		await buildCollectionIdMap();
		const productsId = collectionIdMap.get('products');
		
		// 3. Product Variants
		await createCollection({
			name: 'product_variants',
			type: 'base',
			fields: [
				{
					name: 'product',
					type: 'relation',
					required: true,
					collectionId: productsId,
					cascadeDelete: true,
					maxSelect: 1,
					minSelect: 1
				},
				{
					name: 'name',
					type: 'text',
					required: true,
					max: 100
				},
				{
					name: 'sku',
					type: 'text',
					required: false,
					unique: true,
					max: 100
				},
				{
					name: 'size',
					type: 'text',
					required: false,
					max: 20
				},
				{
					name: 'color',
					type: 'text',
					required: false,
					max: 50
				},
				{
					name: 'price_adjustment',
					type: 'number',
					required: false
				},
				{
					name: 'stock_quantity',
					type: 'number',
					required: false,
					min: 0
				},
				{
					name: 'is_active',
					type: 'bool',
					required: true
				},
				{
					name: 'stripe_price_id',
					type: 'text',
					required: false,
					max: 200
				}
			],
			indexes: [
				'CREATE INDEX IF NOT EXISTS idx_variant_product ON product_variants (product)'
			],
			listRule: 'is_active = true',
			viewRule: 'is_active = true',
			createRule: null,
			updateRule: null,
			deleteRule: null
		});
		
		// 4. Shipping Addresses
		await createCollection({
			name: 'shipping_addresses',
			type: 'base',
			fields: [
				{
					name: 'user',
					type: 'relation',
					required: false,
					collectionId: usersCollectionId,
					cascadeDelete: true,
					maxSelect: 1
				},
				{
					name: 'full_name',
					type: 'text',
					required: true,
					max: 200
				},
				{
					name: 'address_line1',
					type: 'text',
					required: true,
					max: 200
				},
				{
					name: 'address_line2',
					type: 'text',
					required: false,
					max: 200
				},
				{
					name: 'city',
					type: 'text',
					required: true,
					max: 100
				},
				{
					name: 'state',
					type: 'text',
					required: true,
					max: 100
				},
				{
					name: 'postal_code',
					type: 'text',
					required: true,
					max: 20
				},
				{
					name: 'country',
					type: 'text',
					required: true,
					max: 2
				},
				{
					name: 'phone',
					type: 'text',
					required: false,
					max: 20
				},
				{
					name: 'is_default',
					type: 'bool',
					required: true
				}
			],
			indexes: [
				'CREATE INDEX IF NOT EXISTS idx_address_user ON shipping_addresses (user)'
			],
			listRule: '@request.auth.id != "" && (user = @request.auth.id || @request.auth.id != "")',
			viewRule: '@request.auth.id != "" && (user = @request.auth.id || @request.auth.id != "")',
			createRule: '@request.auth.id != ""',
			updateRule: '@request.auth.id != "" && user = @request.auth.id',
			deleteRule: '@request.auth.id != "" && user = @request.auth.id'
		});
		
		await buildCollectionIdMap();
		const shippingAddressesId = collectionIdMap.get('shipping_addresses');
		
		// 5. Orders
		await createCollection({
			name: 'orders',
			type: 'base',
			fields: [
				{
					name: 'order_number',
					type: 'text',
					required: true,
					unique: true,
					max: 50
				},
				{
					name: 'user',
					type: 'relation',
					required: false,
					collectionId: usersCollectionId,
					cascadeDelete: false,
					maxSelect: 1
				},
				{
					name: 'email',
					type: 'email',
					required: true
				},
				{
					name: 'status',
					type: 'select',
					required: true,
					maxSelect: 1,
					values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
				},
				{
					name: 'subtotal',
					type: 'number',
					required: true,
					min: 0
				},
				{
					name: 'tax',
					type: 'number',
					required: true,
					min: 0
				},
				{
					name: 'shipping_cost',
					type: 'number',
					required: true,
					min: 0
				},
				{
					name: 'total',
					type: 'number',
					required: true,
					min: 0
				},
				{
					name: 'currency',
					type: 'text',
					required: true,
					max: 3
				},
				{
					name: 'shipping_address',
					type: 'relation',
					required: false,
					collectionId: shippingAddressesId,
					cascadeDelete: false,
					maxSelect: 1
				},
				{
					name: 'billing_email',
					type: 'email',
					required: true
				},
				{
					name: 'notes',
					type: 'text',
					required: false,
					max: 1000
				},
				{
					name: 'stripe_payment_intent_id',
					type: 'text',
					required: false,
					max: 200
				},
				{
					name: 'stripe_checkout_session_id',
					type: 'text',
					required: false,
					max: 200
				},
				{
					name: 'paid_at',
					type: 'date',
					required: false
				},
				{
					name: 'shipped_at',
					type: 'date',
					required: false
				},
				{
					name: 'delivered_at',
					type: 'date',
					required: false
				}
			],
			indexes: [
				'CREATE UNIQUE INDEX IF NOT EXISTS idx_order_number ON orders (order_number)',
				'CREATE INDEX IF NOT EXISTS idx_order_user ON orders (user)',
				'CREATE INDEX IF NOT EXISTS idx_order_status ON orders (status)',
				'CREATE INDEX IF NOT EXISTS idx_order_email ON orders (email)'
			],
			listRule: '@request.auth.id != "" && (user = @request.auth.id || @request.auth.id != "")',
			viewRule: '@request.auth.id != "" && (user = @request.auth.id || @request.auth.id != "")',
			createRule: '@request.auth.id != ""',
			updateRule: null,
			deleteRule: null
		});
		
		await buildCollectionIdMap();
		const ordersId = collectionIdMap.get('orders');
		const variantsId = collectionIdMap.get('product_variants');
		
		// 6. Order Items
		await createCollection({
			name: 'order_items',
			type: 'base',
			fields: [
				{
					name: 'order',
					type: 'relation',
					required: true,
					collectionId: ordersId,
					cascadeDelete: true,
					maxSelect: 1,
					minSelect: 1
				},
				{
					name: 'product',
					type: 'relation',
					required: true,
					collectionId: productsId,
					cascadeDelete: false,
					maxSelect: 1,
					minSelect: 1
				},
				{
					name: 'variant',
					type: 'relation',
					required: false,
					collectionId: variantsId,
					cascadeDelete: false,
					maxSelect: 1
				},
				{
					name: 'product_name',
					type: 'text',
					required: true,
					max: 200
				},
				{
					name: 'variant_name',
					type: 'text',
					required: false,
					max: 100
				},
				{
					name: 'quantity',
					type: 'number',
					required: true,
					min: 1
				},
				{
					name: 'unit_price',
					type: 'number',
					required: true,
					min: 0
				},
				{
					name: 'total_price',
					type: 'number',
					required: true,
					min: 0
				}
			],
			indexes: [
				'CREATE INDEX IF NOT EXISTS idx_order_item_order ON order_items (order)',
				'CREATE INDEX IF NOT EXISTS idx_order_item_product ON order_items (product)'
			],
			listRule: '@request.auth.id != ""',
			viewRule: '@request.auth.id != ""',
			createRule: null,
			updateRule: null,
			deleteRule: null
		});
		
		// 7. Payments
		await createCollection({
			name: 'payments',
			type: 'base',
			fields: [
				{
					name: 'order',
					type: 'relation',
					required: true,
					collectionId: ordersId,
					cascadeDelete: false,
					maxSelect: 1,
					minSelect: 1
				},
				{
					name: 'stripe_payment_intent_id',
					type: 'text',
					required: true,
					unique: true,
					max: 200
				},
				{
					name: 'stripe_charge_id',
					type: 'text',
					required: false,
					max: 200
				},
				{
					name: 'amount',
					type: 'number',
					required: true,
					min: 0
				},
				{
					name: 'currency',
					type: 'text',
					required: true,
					max: 3
				},
				{
					name: 'status',
					type: 'select',
					required: true,
					maxSelect: 1,
					values: ['pending', 'succeeded', 'failed', 'refunded']
				},
				{
					name: 'payment_method',
					type: 'text',
					required: false,
					max: 50
				},
				{
					name: 'last4',
					type: 'text',
					required: false,
					max: 4
				},
				{
					name: 'receipt_url',
					type: 'url',
					required: false
				},
				{
					name: 'refund_amount',
					type: 'number',
					required: false,
					min: 0
				},
				{
					name: 'refunded_at',
					type: 'date',
					required: false
				},
				{
					name: 'metadata',
					type: 'json',
					required: false
				}
			],
			indexes: [
				'CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intent ON payments (stripe_payment_intent_id)',
				'CREATE INDEX IF NOT EXISTS idx_payment_order ON payments (order)',
				'CREATE INDEX IF NOT EXISTS idx_payment_status ON payments (status)'
			],
			listRule: null,
			viewRule: '@request.auth.id != ""',
			createRule: null,
			updateRule: null,
			deleteRule: null
		});
		
		console.log('✅ E-Commerce migration V2 completed successfully!');
		console.log('\n📊 Summary:');
		console.log('   - Created: 7 collections');
		console.log('   - product_categories');
		console.log('   - products');
		console.log('   - product_variants');
		console.log('   - shipping_addresses');
		console.log('   - orders');
		console.log('   - order_items');
		console.log('   - payments');
		console.log('\n🎉 Your FLI Golf Shop database is ready!');
		console.log('\n📝 Next steps:');
		console.log('   1. Set up Stripe account and get API keys');
		console.log('   2. Configure Stripe webhooks');
		console.log('   3. Create product categories');
		console.log('   4. Add products to the shop');
		
	} catch (error: any) {
		console.error('\n❌ Migration failed:', error.message);
		process.exit(1);
	}
}

main();
