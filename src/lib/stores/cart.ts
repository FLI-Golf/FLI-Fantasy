/**
 * Shopping Cart Store
 * 
 * Manages cart items in browser localStorage
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface CartItem {
	id: string;
	name: string;
	price: number; // in cents
	quantity: number;
	stripe_price_id: string;
	image?: string | null;
	variant?: {
		id: string;
		name: string;
	};
}

const CART_STORAGE_KEY = 'fli_golf_cart';

// Load cart from localStorage
function loadCart(): CartItem[] {
	if (!browser) return [];
	
	try {
		const stored = localStorage.getItem(CART_STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch (error) {
		console.error('Error loading cart:', error);
		return [];
	}
}

// Save cart to localStorage
function saveCart(items: CartItem[]) {
	if (!browser) return;
	
	try {
		localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
	} catch (error) {
		console.error('Error saving cart:', error);
	}
}

function createCartStore() {
	const { subscribe, set, update } = writable<CartItem[]>(loadCart());
	
	return {
		subscribe,
		
		// Add item to cart
		addItem: (item: CartItem) => {
			update(items => {
				// Check if item already exists
				const existingIndex = items.findIndex(i => 
					i.id === item.id && 
					i.variant?.id === item.variant?.id
				);
				
				if (existingIndex >= 0) {
					// Increase quantity
					items[existingIndex].quantity += item.quantity;
				} else {
					// Add new item
					items.push(item);
				}
				
				saveCart(items);
				return items;
			});
		},
		
		// Remove item from cart
		removeItem: (itemId: string, variantId?: string) => {
			update(items => {
				const filtered = items.filter(item => {
					if (variantId) {
						return !(item.id === itemId && item.variant?.id === variantId);
					}
					return item.id !== itemId;
				});
				saveCart(filtered);
				return filtered;
			});
		},
		
		// Update item quantity
		updateQuantity: (itemId: string, quantity: number, variantId?: string) => {
			update(items => {
				const item = items.find(i => {
					if (variantId) {
						return i.id === itemId && i.variant?.id === variantId;
					}
					return i.id === itemId;
				});
				
				if (item) {
					if (quantity <= 0) {
						// Remove item if quantity is 0
						const filtered = items.filter(i => i !== item);
						saveCart(filtered);
						return filtered;
					}
					item.quantity = quantity;
				}
				
				saveCart(items);
				return items;
			});
		},
		
		// Clear cart
		clear: () => {
			set([]);
			saveCart([]);
		},
		
		// Get cart total
		getTotal: (items: CartItem[]): number => {
			return items.reduce((total, item) => total + (item.price * item.quantity), 0);
		},
		
		// Get cart count
		getCount: (items: CartItem[]): number => {
			return items.reduce((count, item) => count + item.quantity, 0);
		}
	};
}

export const cart = createCartStore();
