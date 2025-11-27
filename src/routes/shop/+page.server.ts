import type { PageServerLoad } from './$types';
import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

export const load: PageServerLoad = async () => {
	const pb = new PocketBase(POCKETBASE_URL);
	
	try {
		// Fetch all active products with their categories
		const products = await pb.collection('products').getList(1, 50, {
			filter: 'is_active = true',
			sort: '-is_featured,-created',
			expand: 'category'
		});
		
		// Fetch all categories
		const categories = await pb.collection('product_categories').getList(1, 50, {
			filter: 'is_active = true',
			sort: 'sort_order'
		});
		
		return {
			products: products.items,
			categories: categories.items
		};
	} catch (error) {
		console.error('Error loading products:', error);
		return {
			products: [],
			categories: []
		};
	}
};
