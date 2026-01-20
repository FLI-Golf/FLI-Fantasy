/**
 * Checkout API Endpoint
 * 
 * Creates a Stripe Checkout Session and PocketBase order
 * Requires authenticated user - order is linked to their account
 */

import { json } from '@sveltejs/kit';
import { createCheckoutSession } from '$lib/server/stripe';
import PocketBase from 'pocketbase';
import type { RequestHandler } from './$types';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || '';

function generateOrderNumber(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 7);
	return `FLI-${timestamp}-${random}`.toUpperCase();
}

export const POST: RequestHandler = async ({ request, url, locals }) => {
	try {
		const { items, customerEmail, userId } = await request.json();
		
		if (!items || items.length === 0) {
			return json({ error: 'No items in cart' }, { status: 400 });
		}
		
		// Require authenticated user
		if (!userId) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}
		
		// Calculate totals
		const subtotal = items.reduce((sum: number, item: any) => 
			sum + (item.price * item.quantity), 0
		);
		const tax = 0; // Calculate tax based on location if needed
		const shippingCost = 0; // Calculate shipping if needed
		const total = subtotal + tax + shippingCost;
		
		// Create PocketBase client with admin auth for creating order items
		const pb = new PocketBase(POCKETBASE_URL);
		await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
		
		const orderNumber = generateOrderNumber();
		
		// Create order linked to user
		const order = await pb.collection('orders').create({
			order_number: orderNumber,
			user: userId,
			email: customerEmail,
			status: 'pending',
			subtotal,
			tax,
			shipping_cost: shippingCost,
			total,
			currency: 'usd',
			billing_email: customerEmail
		});
		
		// Create order items (requires admin auth)
		for (const item of items) {
			await pb.collection('order_items').create({
				order: order.id,
				product: item.id,
				product_name: item.name,
				variant_name: item.variant?.name || null,
				quantity: item.quantity,
				unit_price: item.price,
				total_price: item.price * item.quantity
			});
		}
		
		// Create Stripe line items
		const lineItems = items.map((item: any) => ({
			price: item.stripe_price_id,
			quantity: item.quantity
		}));
		
		// Create Stripe Checkout Session
		const session = await createCheckoutSession({
			lineItems,
			successUrl: `${url.origin}/shop/order/success?session_id={CHECKOUT_SESSION_ID}`,
			cancelUrl: `${url.origin}/shop/cart`,
			customerEmail: customerEmail || undefined,
			metadata: {
				orderId: order.id,
				orderNumber: orderNumber,
				userId: userId
			}
		});
		
		// Update order with Stripe session ID
		await pb.collection('orders').update(order.id, {
			stripe_checkout_session_id: session.id
		});
		
		return json({ 
			sessionId: session.id,
			orderNumber: orderNumber
		});
		
	} catch (error: any) {
		console.error('Checkout error:', error);
		return json({ 
			error: error.message || 'Failed to create checkout session' 
		}, { status: 500 });
	}
};
