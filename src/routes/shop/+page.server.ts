import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/public';

export const load: PageServerLoad = async ({ fetch }) => {
	const POCKETBASE_URL = env.VITE_POCKETBASE_URL || 'https://pocketbase-production-e678.up.railway.app';
	
	console.log('🛒 Shop page loading...');
	console.log('📍 PocketBase URL:', POCKETBASE_URL);
	
	try {
		// Fetch products using native fetch (more reliable in SvelteKit)
		console.log('📦 Fetching products...');
		const productsParams = new URLSearchParams({
			filter: 'is_active = true',
			sort: '-is_featured'
		});
		const productsRes = await fetch(
			`${POCKETBASE_URL}/api/collections/products/records?${productsParams}`
		);
		
		if (!productsRes.ok) {
			const errorText = await productsRes.text();
			console.error('Products error response:', errorText);
			throw new Error(`Products fetch failed: ${productsRes.status}`);
		}
		
		const productsData = await productsRes.json();
		console.log(`✅ Found ${productsData.items?.length || 0} products`);
		
		// Fetch categories
		console.log('📂 Fetching categories...');
		const categoriesParams = new URLSearchParams({
			filter: 'is_active = true',
			sort: 'sort_order'
		});
		const categoriesRes = await fetch(
			`${POCKETBASE_URL}/api/collections/product_categories/records?${categoriesParams}`
		);
		
		if (!categoriesRes.ok) {
			throw new Error(`Categories fetch failed: ${categoriesRes.status}`);
		}
		
		const categoriesData = await categoriesRes.json();
		console.log(`✅ Found ${categoriesData.items?.length || 0} categories`);
		
		return {
			products: productsData.items || [],
			categories: categoriesData.items || []
		};
	} catch (error: any) {
		console.error('❌ Error loading products:', error.message);
		console.error('❌ Full error:', error);
		return {
			products: [],
			categories: [],
			error: error.message
		};
	}
};
